-- =====================================================================
-- FASE 6: checklist por evento (módulo 8) — templates reutilizáveis
-- com prazos relativos à data do evento, aplicáveis a qualquer evento.
-- =====================================================================

CREATE TABLE public.checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklists TO authenticated;
GRANT ALL ON public.checklists TO service_role;
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklists: isolamento por empresa" ON public.checklists FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));

-- dias_antes: quantos dias antes da data do evento essa tarefa deve
-- estar concluída (ex.: 15 = "15 dias antes do evento"). É só usado
-- como referência para calcular checklist_itens.data_prazo no momento
-- em que o template é aplicado a um evento — depois disso o item vive
-- independente do template (editar o template não afeta eventos que
-- já aplicaram ele).
CREATE TABLE public.checklist_template_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  dias_antes INTEGER NOT NULL DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX checklist_template_itens_checklist_idx ON public.checklist_template_itens(checklist_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_template_itens TO authenticated;
GRANT ALL ON public.checklist_template_itens TO service_role;
ALTER TABLE public.checklist_template_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist_template_itens: isolamento por empresa" ON public.checklist_template_itens FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));

CREATE TABLE public.evento_checklist_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  data_prazo DATE,
  concluido BOOLEAN NOT NULL DEFAULT false,
  concluido_em TIMESTAMPTZ,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX evento_checklist_itens_evento_idx ON public.evento_checklist_itens(evento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evento_checklist_itens TO authenticated;
GRANT ALL ON public.evento_checklist_itens TO service_role;
ALTER TABLE public.evento_checklist_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evento_checklist_itens: isolamento por empresa" ON public.evento_checklist_itens FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));
