CREATE TABLE IF NOT EXISTS public.evento_equipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  equipe_id UUID NOT NULL REFERENCES public.equipes(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (evento_id, equipe_id)
);
CREATE INDEX IF NOT EXISTS evento_equipes_evento_idx ON public.evento_equipes(evento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evento_equipes TO authenticated;
GRANT ALL ON public.evento_equipes TO service_role;
ALTER TABLE public.evento_equipes ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='evento_equipes' AND policyname='evento_equipes: isolamento por empresa') THEN
    CREATE POLICY "evento_equipes: isolamento por empresa" ON public.evento_equipes FOR ALL TO authenticated
      USING (empresa_id = public.get_empresa_id(auth.uid()))
      WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='evento_equipes_trava_trg') THEN
    CREATE TRIGGER evento_equipes_trava_trg
      BEFORE INSERT OR UPDATE OR DELETE ON public.evento_equipes
      FOR EACH ROW EXECUTE FUNCTION public.verificar_orcamento_editavel();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.evento_estruturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  estrutura_id UUID NOT NULL REFERENCES public.estruturas(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (evento_id, estrutura_id)
);
CREATE INDEX IF NOT EXISTS evento_estruturas_evento_idx ON public.evento_estruturas(evento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evento_estruturas TO authenticated;
GRANT ALL ON public.evento_estruturas TO service_role;
ALTER TABLE public.evento_estruturas ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='evento_estruturas' AND policyname='evento_estruturas: isolamento por empresa') THEN
    CREATE POLICY "evento_estruturas: isolamento por empresa" ON public.evento_estruturas FOR ALL TO authenticated
      USING (empresa_id = public.get_empresa_id(auth.uid()))
      WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='evento_estruturas_trava_trg') THEN
    CREATE TRIGGER evento_estruturas_trava_trg
      BEFORE INSERT OR UPDATE OR DELETE ON public.evento_estruturas
      FOR EACH ROW EXECUTE FUNCTION public.verificar_orcamento_editavel();
  END IF;
END $$;