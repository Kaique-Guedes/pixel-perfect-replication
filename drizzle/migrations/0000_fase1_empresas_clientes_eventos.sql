-- =====================================================================
-- FASE 1: multi-tenant (empresas), usuários/papéis, clientes (CRM) e agenda
-- Todas as tabelas de dados têm empresa_id e RLS isolando por empresa.
-- =====================================================================

CREATE TYPE public.app_role AS ENUM ('admin', 'usuario');
CREATE TYPE public.tipo_negocio AS ENUM ('buffet', 'casa_de_festas', 'cerimonial', 'produtora');
CREATE TYPE public.cliente_status AS ENUM ('novo_lead', 'em_negociacao', 'cliente_ativo', 'perdido');
CREATE TYPE public.evento_status AS ENUM ('orcamento', 'contrato_assinado', 'confirmado', 'realizado', 'cancelado');

-- ---------------------------------------------------------------------
-- EMPRESAS (tenant)
-- margem_alvo / margem_minima: usadas no indicador de margem (módulo 3)
-- ---------------------------------------------------------------------
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  tipo_negocio public.tipo_negocio,
  margem_alvo NUMERIC(5,2) NOT NULL DEFAULT 35,
  margem_minima NUMERIC(5,2) NOT NULL DEFAULT 20,
  markup_padrao NUMERIC(6,2) NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.empresas TO authenticated;
GRANT ALL ON public.empresas TO service_role;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- PERFIS (1 por usuário autenticado) — liga o usuário à empresa
-- ---------------------------------------------------------------------
CREATE TABLE public.perfis (
  id UUID PRIMARY KEY,               -- = auth.users.id (sem FK por regra da plataforma)
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.perfis TO authenticated;
GRANT ALL ON public.perfis TO service_role;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- PAPÉIS (separado do perfil por segurança)
-- ---------------------------------------------------------------------
CREATE TABLE public.usuarios_papeis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.usuarios_papeis TO authenticated;
GRANT ALL ON public.usuarios_papeis TO service_role;
ALTER TABLE public.usuarios_papeis ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- Funções auxiliares (SECURITY DEFINER evita recursão de RLS)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_empresa_id(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT empresa_id FROM public.perfis WHERE id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios_papeis WHERE user_id = _user_id AND role = _role)
$$;

-- Onboarding: cria empresa + perfil + papel admin para o usuário logado (1x)
CREATE OR REPLACE FUNCTION public.criar_empresa(
  _nome_empresa TEXT, _cnpj TEXT, _tipo public.tipo_negocio, _nome_usuario TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _empresa_id UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF EXISTS (SELECT 1 FROM public.perfis WHERE id = _uid) THEN
    RAISE EXCEPTION 'Usuário já pertence a uma empresa';
  END IF;
  INSERT INTO public.empresas (nome, cnpj, tipo_negocio)
  VALUES (_nome_empresa, NULLIF(_cnpj, ''), _tipo) RETURNING id INTO _empresa_id;
  INSERT INTO public.perfis (id, empresa_id, nome, email)
  VALUES (_uid, _empresa_id, _nome_usuario, (SELECT email FROM auth.users WHERE id = _uid));
  INSERT INTO public.usuarios_papeis (user_id, empresa_id, role) VALUES (_uid, _empresa_id, 'admin');
  RETURN _empresa_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.criar_empresa(TEXT, TEXT, public.tipo_negocio, TEXT) TO authenticated;

-- Policies empresas / perfis / papéis
CREATE POLICY "empresa: membros veem" ON public.empresas FOR SELECT TO authenticated
  USING (id = public.get_empresa_id(auth.uid()));
CREATE POLICY "empresa: admin edita" ON public.empresas FOR UPDATE TO authenticated
  USING (id = public.get_empresa_id(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "perfis: mesma empresa vê" ON public.perfis FOR SELECT TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()) OR id = auth.uid());
CREATE POLICY "perfis: próprio edita" ON public.perfis FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "papeis: mesma empresa vê" ON public.usuarios_papeis FOR SELECT TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()) OR user_id = auth.uid());

-- ---------------------------------------------------------------------
-- CLIENTES (CRM básico)
-- ---------------------------------------------------------------------
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  origem TEXT,
  status public.cliente_status NOT NULL DEFAULT 'novo_lead',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX clientes_empresa_idx ON public.clientes(empresa_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes: isolamento por empresa" ON public.clientes FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));

CREATE TABLE public.clientes_interacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  texto TEXT NOT NULL,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX clientes_interacoes_cliente_idx ON public.clientes_interacoes(cliente_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes_interacoes TO authenticated;
GRANT ALL ON public.clientes_interacoes TO service_role;
ALTER TABLE public.clientes_interacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interacoes: isolamento por empresa" ON public.clientes_interacoes FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));

-- ---------------------------------------------------------------------
-- EVENTOS (agenda)
-- ---------------------------------------------------------------------
CREATE TABLE public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fim TIME NOT NULL,
  local TEXT,
  convidados_estimados INTEGER NOT NULL DEFAULT 0,
  status public.evento_status NOT NULL DEFAULT 'orcamento',
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX eventos_empresa_data_idx ON public.eventos(empresa_id, data);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eventos TO authenticated;
GRANT ALL ON public.eventos TO service_role;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eventos: isolamento por empresa" ON public.eventos FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));

-- ---------------------------------------------------------------------
-- REGRA DE NEGÓCIO: bloqueio de overbooking
-- Dois eventos "travados" (contrato_assinado ou confirmado) não podem
-- coexistir na mesma empresa, mesmo local, mesma data e horário sobreposto.
-- Eventos em 'orcamento' não bloqueiam (a UI apenas alerta).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verificar_overbooking()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  _conflito TEXT;
BEGIN
  IF NEW.status IN ('contrato_assinado', 'confirmado') THEN
    SELECT e.titulo INTO _conflito
    FROM public.eventos e
    WHERE e.empresa_id = NEW.empresa_id
      AND e.id <> NEW.id
      AND e.status IN ('contrato_assinado', 'confirmado')
      AND e.data = NEW.data
      AND COALESCE(lower(trim(e.local)), '') = COALESCE(lower(trim(NEW.local)), '')
      AND e.hora_inicio < NEW.hora_fim
      AND e.hora_fim > NEW.hora_inicio
    LIMIT 1;
    IF _conflito IS NOT NULL THEN
      RAISE EXCEPTION 'OVERBOOKING: já existe o evento confirmado "%" neste local e horário', _conflito;
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER eventos_overbooking_trg
  BEFORE INSERT OR UPDATE ON public.eventos
  FOR EACH ROW EXECUTE FUNCTION public.verificar_overbooking();

-- updated_at em clientes
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
CREATE TRIGGER clientes_updated_at_trg BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
