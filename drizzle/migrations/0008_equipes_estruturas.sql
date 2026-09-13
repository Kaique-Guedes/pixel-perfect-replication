-- =====================================================================
-- Adiciona, dentro do Cardápio, dois novos tipos de composição
-- reutilizável — mesmo espírito de itens_cardapio (prato = ingredientes
-- + quantidade), mas para:
--   equipes: funcionário + horas trabalhadas → custo
--   estruturas: material + quantidade → custo
-- Cada uma é um "modelo" nomeado que a usuária monta uma vez e pode
-- reaproveisar (ex.: "Equipe padrão casamento", "Estrutura 100
-- convidados"). Adicionar essas composições a um evento específico
-- fica para uma etapa futura — por ora só o cadastro com o custo
-- calculado automaticamente.
-- =====================================================================

CREATE TABLE public.equipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipes TO authenticated;
GRANT ALL ON public.equipes TO service_role;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipes: isolamento por empresa" ON public.equipes FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));

CREATE TABLE public.equipes_funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  equipe_id UUID NOT NULL REFERENCES public.equipes(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE RESTRICT,
  horas NUMERIC(6,2) NOT NULL,
  UNIQUE (equipe_id, funcionario_id)
);
CREATE INDEX equipes_funcionarios_equipe_idx ON public.equipes_funcionarios(equipe_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipes_funcionarios TO authenticated;
GRANT ALL ON public.equipes_funcionarios TO service_role;
ALTER TABLE public.equipes_funcionarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "equipes_funcionarios: isolamento por empresa" ON public.equipes_funcionarios FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));

CREATE TABLE public.estruturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estruturas TO authenticated;
GRANT ALL ON public.estruturas TO service_role;
ALTER TABLE public.estruturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estruturas: isolamento por empresa" ON public.estruturas FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));

CREATE TABLE public.estruturas_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  estrutura_id UUID NOT NULL REFERENCES public.estruturas(id) ON DELETE CASCADE,
  ingrediente_id UUID NOT NULL REFERENCES public.ingredientes(id) ON DELETE RESTRICT,
  quantidade NUMERIC(10,4) NOT NULL,
  UNIQUE (estrutura_id, ingrediente_id)
);
CREATE INDEX estruturas_materiais_estrutura_idx ON public.estruturas_materiais(estrutura_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estruturas_materiais TO authenticated;
GRANT ALL ON public.estruturas_materiais TO service_role;
ALTER TABLE public.estruturas_materiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "estruturas_materiais: isolamento por empresa" ON public.estruturas_materiais FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));
