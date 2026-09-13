DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'tipo_insumo' AND n.nspname = 'public') THEN
    CREATE TYPE public.tipo_insumo AS ENUM ('ingrediente', 'material');
  END IF;
END $$;

ALTER TABLE public.ingredientes ADD COLUMN IF NOT EXISTS tipo public.tipo_insumo NOT NULL DEFAULT 'ingrediente';

CREATE TABLE IF NOT EXISTS public.evento_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  ingrediente_id UUID NOT NULL REFERENCES public.ingredientes(id) ON DELETE RESTRICT,
  quantidade_por_convidado NUMERIC(10,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evento_materiais_evento_idx ON public.evento_materiais(evento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evento_materiais TO authenticated;
GRANT ALL ON public.evento_materiais TO service_role;
ALTER TABLE public.evento_materiais ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='evento_materiais' AND policyname='evento_materiais: isolamento por empresa') THEN
    CREATE POLICY "evento_materiais: isolamento por empresa" ON public.evento_materiais FOR ALL TO authenticated
      USING (empresa_id = public.get_empresa_id(auth.uid()))
      WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='evento_materiais_trava_trg') THEN
    CREATE TRIGGER evento_materiais_trava_trg
      BEFORE INSERT OR UPDATE OR DELETE ON public.evento_materiais
      FOR EACH ROW EXECUTE FUNCTION public.verificar_orcamento_editavel();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  funcao TEXT NOT NULL,
  valor_hora NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.funcionarios TO authenticated;
GRANT ALL ON public.funcionarios TO service_role;
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='funcionarios' AND policyname='funcionarios: isolamento por empresa') THEN
    CREATE POLICY "funcionarios: isolamento por empresa" ON public.funcionarios FOR ALL TO authenticated
      USING (empresa_id = public.get_empresa_id(auth.uid()))
      WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));
  END IF;
END $$;