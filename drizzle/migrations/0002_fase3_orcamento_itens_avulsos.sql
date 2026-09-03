-- =====================================================================
-- FASE 3: itens avulsos de orçamento (módulo 5) + trava de edição do
-- orçamento.
--
-- Decisão de design: em vez de tabelas separadas `orcamentos` e
-- `contratos`, reaproveitamos o `eventos.status` que já existe desde a
-- Fase 1 ('orcamento' → 'contrato_assinado' → ...). O "orçamento" é a
-- combinação, calculada no cliente, de:
--   evento_cardapio_itens (Fase 2, itens de cardápio escolhidos)
--   + orcamento_itens_avulsos (itens fora do cardápio, ex.: decoração)
--   × eventos.convidados_estimados
-- e "converter em contrato" é simplesmente mudar eventos.status.
-- Isso evita manter duas fontes de verdade sincronizadas.
-- =====================================================================

CREATE TYPE public.tipo_item_avulso AS ENUM ('fixo', 'por_convidado');

CREATE TABLE public.orcamento_itens_avulsos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  tipo public.tipo_item_avulso NOT NULL DEFAULT 'fixo',
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX orcamento_itens_avulsos_evento_idx ON public.orcamento_itens_avulsos(evento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orcamento_itens_avulsos TO authenticated;
GRANT ALL ON public.orcamento_itens_avulsos TO service_role;
ALTER TABLE public.orcamento_itens_avulsos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itens_avulsos: isolamento por empresa" ON public.orcamento_itens_avulsos FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));

-- ---------------------------------------------------------------------
-- REGRA DE NEGÓCIO: trava de edição do orçamento.
-- Depois que o evento sai do status 'orcamento' (ex.: vira
-- 'contrato_assinado'), ninguém pode inserir/alterar/excluir os itens
-- de cardápio ou avulsos daquele evento — só reabrindo o orçamento
-- (voltando eventos.status para 'orcamento', ação exposta só para
-- admin na tela) é que a edição volta a ser permitida.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verificar_orcamento_editavel()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  _status public.evento_status;
  _evento_id UUID := COALESCE(NEW.evento_id, OLD.evento_id);
BEGIN
  SELECT status INTO _status FROM public.eventos WHERE id = _evento_id;
  IF _status IS DISTINCT FROM 'orcamento' THEN
    RAISE EXCEPTION 'ORCAMENTO_TRAVADO: este orçamento não está mais editável (status atual do evento: %). Reabra o orçamento para editar.', _status;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER evento_cardapio_itens_trava_trg
  BEFORE INSERT OR UPDATE OR DELETE ON public.evento_cardapio_itens
  FOR EACH ROW EXECUTE FUNCTION public.verificar_orcamento_editavel();

CREATE TRIGGER orcamento_itens_avulsos_trava_trg
  BEFORE INSERT OR UPDATE OR DELETE ON public.orcamento_itens_avulsos
  FOR EACH ROW EXECUTE FUNCTION public.verificar_orcamento_editavel();
