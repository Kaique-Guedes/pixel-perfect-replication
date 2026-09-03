-- =====================================================================
-- FASE 5: movimentações de estoque (módulo 7) — base para a lista de
-- compras automática.
--
-- ingredientes.estoque_atual (Fase 2) continua sendo o saldo corrente,
-- mas agora é sempre alterado através de um lançamento em
-- movimentacoes_estoque (entrada = compra, saída = baixa manual ou
-- consumo pós-evento), nunca editado diretamente pela tela — isso dá
-- um histórico auditável de por que o saldo mudou. Um trigger mantém
-- o saldo em ingredientes.estoque_atual sincronizado a cada
-- lançamento, então o consumidor da lista de compras só precisa ler
-- estoque_atual (rápido), sem somar o ledger inteiro toda vez.
-- =====================================================================

CREATE TYPE public.tipo_movimentacao_estoque AS ENUM ('entrada', 'saida');

CREATE TABLE public.movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  ingrediente_id UUID NOT NULL REFERENCES public.ingredientes(id) ON DELETE CASCADE,
  evento_id UUID REFERENCES public.eventos(id) ON DELETE SET NULL,
  tipo public.tipo_movimentacao_estoque NOT NULL,
  quantidade NUMERIC(12,3) NOT NULL CHECK (quantidade > 0),
  observacao TEXT,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX movimentacoes_estoque_ingrediente_idx ON public.movimentacoes_estoque(ingrediente_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.movimentacoes_estoque TO authenticated;
GRANT ALL ON public.movimentacoes_estoque TO service_role;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
CREATE POLICY "movimentacoes: isolamento por empresa" ON public.movimentacoes_estoque FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));

-- Mantém ingredientes.estoque_atual sincronizado com o ledger.
-- Cobre INSERT (aplica o efeito) e DELETE (desfaz o efeito, para quem
-- lançar uma movimentação errada por engano); não cobre UPDATE porque
-- a tela nunca edita uma movimentação — só lança novas ou exclui.
CREATE OR REPLACE FUNCTION public.aplicar_movimentacao_estoque()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.ingredientes
    SET estoque_atual = estoque_atual + (CASE WHEN NEW.tipo = 'entrada' THEN NEW.quantidade ELSE -NEW.quantidade END)
    WHERE id = NEW.ingrediente_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.ingredientes
    SET estoque_atual = estoque_atual - (CASE WHEN OLD.tipo = 'entrada' THEN OLD.quantidade ELSE -OLD.quantidade END)
    WHERE id = OLD.ingrediente_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER movimentacoes_estoque_aplicar_trg
  AFTER INSERT OR DELETE ON public.movimentacoes_estoque
  FOR EACH ROW EXECUTE FUNCTION public.aplicar_movimentacao_estoque();
