-- =====================================================================
-- FASE 4: financeiro por evento (módulo 6) — parcelas a receber e
-- despesas.
--
-- Decisão de design: "atrasado" NÃO é armazenado como status — seria
-- um estado derivado que seria fácil deixar dessincronizado (seria
-- preciso um job rodando todo dia pra virar o status). Em vez disso,
-- parcelas só têm 'pendente' | 'pago'; "atrasada" é calculado sempre
-- que necessário como `status = 'pendente' AND data_vencimento < hoje`
-- — tanto em SQL (view/consulta) quanto no frontend. Sempre correto,
-- nunca precisa de sincronização.
--
-- Diferente de evento_cardapio_itens/orcamento_itens_avulsos (Fase 3),
-- parcelas e despesas NÃO são travadas pelo status do evento: elas
-- passam a existir justamente depois que o orçamento vira contrato,
-- então travar pelo mesmo status não faria sentido aqui.
-- =====================================================================

CREATE TYPE public.status_parcela AS ENUM ('pendente', 'pago');

CREATE TABLE public.parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL DEFAULT '',
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  data_vencimento DATE NOT NULL,
  status public.status_parcela NOT NULL DEFAULT 'pendente',
  data_pagamento DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX parcelas_evento_idx ON public.parcelas(evento_id);
CREATE INDEX parcelas_empresa_vencimento_idx ON public.parcelas(empresa_id, data_vencimento);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parcelas TO authenticated;
GRANT ALL ON public.parcelas TO service_role;
ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parcelas: isolamento por empresa" ON public.parcelas FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));

CREATE TABLE public.despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  fornecedor TEXT,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX despesas_evento_idx ON public.despesas(evento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.despesas TO authenticated;
GRANT ALL ON public.despesas TO service_role;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "despesas: isolamento por empresa" ON public.despesas FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));
