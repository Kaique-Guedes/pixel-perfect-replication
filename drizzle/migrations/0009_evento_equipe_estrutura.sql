-- =====================================================================
-- Integra Equipe e Estruturas ao orçamento do evento — mesmo espírito
-- de evento_cardapio_itens / evento_materiais: a usuária escolhe, entre
-- as equipes/estruturas já cadastradas em Cardápio, quais entram no
-- orçamento daquele evento específico.
--
-- Decisão de escala (pedido explícito: "tudo calculado de acordo com
-- número de pessoas"):
--   - Estruturas: materiais como mesa/cadeira/colher são naturalmente
--     proporcionais ao nº de convidados, então
--     estruturas_materiais.quantidade passa a significar "quantidade
--     por convidado" (renomeada), igual já funciona em
--     itens_cardapio_ingredientes e evento_materiais. O custo de uma
--     estrutura no orçamento = custo por convidado da estrutura ×
--     convidados do evento.
--   - Equipe: horas de um funcionário não escalam linearmente por
--     convidado (um cozinheiro não trabalha "X horas por convidado",
--     trabalha um total fixo naquele evento) — continua sendo um
--     custo fixo por evento, sem multiplicar por convidados.
-- =====================================================================

ALTER TABLE public.estruturas_materiais RENAME COLUMN quantidade TO quantidade_por_convidado;

CREATE TABLE public.evento_equipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  equipe_id UUID NOT NULL REFERENCES public.equipes(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (evento_id, equipe_id)
);
CREATE INDEX evento_equipes_evento_idx ON public.evento_equipes(evento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evento_equipes TO authenticated;
GRANT ALL ON public.evento_equipes TO service_role;
ALTER TABLE public.evento_equipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evento_equipes: isolamento por empresa" ON public.evento_equipes FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));
CREATE TRIGGER evento_equipes_trava_trg
  BEFORE INSERT OR UPDATE OR DELETE ON public.evento_equipes
  FOR EACH ROW EXECUTE FUNCTION public.verificar_orcamento_editavel();

CREATE TABLE public.evento_estruturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  estrutura_id UUID NOT NULL REFERENCES public.estruturas(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (evento_id, estrutura_id)
);
CREATE INDEX evento_estruturas_evento_idx ON public.evento_estruturas(evento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evento_estruturas TO authenticated;
GRANT ALL ON public.evento_estruturas TO service_role;
ALTER TABLE public.evento_estruturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evento_estruturas: isolamento por empresa" ON public.evento_estruturas FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));
CREATE TRIGGER evento_estruturas_trava_trg
  BEFORE INSERT OR UPDATE OR DELETE ON public.evento_estruturas
  FOR EACH ROW EXECUTE FUNCTION public.verificar_orcamento_editavel();
