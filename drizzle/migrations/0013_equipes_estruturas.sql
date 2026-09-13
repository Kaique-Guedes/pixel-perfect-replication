CREATE TABLE IF NOT EXISTS public.equipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipes TO authenticated;
GRANT ALL ON public.equipes TO service_role;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='equipes' AND policyname='equipes: isolamento por empresa') THEN
    CREATE POLICY "equipes: isolamento por empresa" ON public.equipes FOR ALL TO authenticated
      USING (empresa_id = public.get_empresa_id(auth.uid()))
      WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.equipes_funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  equipe_id UUID NOT NULL REFERENCES public.equipes(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE RESTRICT,
  horas NUMERIC(6,2) NOT NULL,
  UNIQUE (equipe_id, funcionario_id)
);
CREATE INDEX IF NOT EXISTS equipes_funcionarios_equipe_idx ON public.equipes_funcionarios(equipe_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipes_funcionarios TO authenticated;
GRANT ALL ON public.equipes_funcionarios TO service_role;
ALTER TABLE public.equipes_funcionarios ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='equipes_funcionarios' AND policyname='equipes_funcionarios: isolamento por empresa') THEN
    CREATE POLICY "equipes_funcionarios: isolamento por empresa" ON public.equipes_funcionarios FOR ALL TO authenticated
      USING (empresa_id = public.get_empresa_id(auth.uid()))
      WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.estruturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estruturas TO authenticated;
GRANT ALL ON public.estruturas TO service_role;
ALTER TABLE public.estruturas ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='estruturas' AND policyname='estruturas: isolamento por empresa') THEN
    CREATE POLICY "estruturas: isolamento por empresa" ON public.estruturas FOR ALL TO authenticated
      USING (empresa_id = public.get_empresa_id(auth.uid()))
      WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.estruturas_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  estrutura_id UUID NOT NULL REFERENCES public.estruturas(id) ON DELETE CASCADE,
  ingrediente_id UUID NOT NULL REFERENCES public.ingredientes(id) ON DELETE RESTRICT,
  quantidade NUMERIC(10,4) NOT NULL,
  UNIQUE (estrutura_id, ingrediente_id)
);
CREATE INDEX IF NOT EXISTS estruturas_materiais_estrutura_idx ON public.estruturas_materiais(estrutura_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estruturas_materiais TO authenticated;
GRANT ALL ON public.estruturas_materiais TO service_role;
ALTER TABLE public.estruturas_materiais ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='estruturas_materiais' AND policyname='estruturas_materiais: isolamento por empresa') THEN
    CREATE POLICY "estruturas_materiais: isolamento por empresa" ON public.estruturas_materiais FOR ALL TO authenticated
      USING (empresa_id = public.get_empresa_id(auth.uid()))
      WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));
  END IF;
END $$;