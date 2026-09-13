-- =====================================================================
-- Expande "Ingredientes" para também cadastrar Materiais (mesa,
-- cadeira, colher de plástico etc. — com preço unitário, usados
-- diretamente no orçamento do evento por convidado) e Equipe
-- (funcionários com valor por hora — cozinheiro, garçom etc.).
--
-- Decisão de design: ingredientes e materiais ficam na MESMA tabela
-- (public.ingredientes), diferenciados por uma nova coluna `tipo`.
-- Ambos compartilham a mesma forma (nome, unidade, preço, categoria,
-- estoque) — a diferença é só onde são usados: ingrediente entra na
-- ficha técnica de um prato (itens_cardapio_ingredientes); material
-- entra direto no orçamento do evento (evento_materiais), sem passar
-- por um prato. Duplicar a tabela geraria dois CRUDs quase idênticos
-- sem necessidade.
-- =====================================================================

CREATE TYPE public.tipo_insumo AS ENUM ('ingrediente', 'material');

ALTER TABLE public.ingredientes ADD COLUMN tipo public.tipo_insumo NOT NULL DEFAULT 'ingrediente';

-- ---------------------------------------------------------------------
-- MATERIAIS DO EVENTO — igual em espírito a evento_cardapio_itens,
-- mas para materiais: a usuária escolhe o material e informa a
-- quantidade por convidado direto no orçamento (não existe "ficha
-- técnica" de material, o material não pertence a um prato).
-- Mesma trava de edição do orçamento que os outros itens do orçamento.
-- ---------------------------------------------------------------------
CREATE TABLE public.evento_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  ingrediente_id UUID NOT NULL REFERENCES public.ingredientes(id) ON DELETE RESTRICT,
  quantidade_por_convidado NUMERIC(10,4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX evento_materiais_evento_idx ON public.evento_materiais(evento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evento_materiais TO authenticated;
GRANT ALL ON public.evento_materiais TO service_role;
ALTER TABLE public.evento_materiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evento_materiais: isolamento por empresa" ON public.evento_materiais FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));

CREATE TRIGGER evento_materiais_trava_trg
  BEFORE INSERT OR UPDATE OR DELETE ON public.evento_materiais
  FOR EACH ROW EXECUTE FUNCTION public.verificar_orcamento_editavel();

-- ---------------------------------------------------------------------
-- EQUIPE — funcionários/prestadores com valor por hora (cozinheiro,
-- garçom etc.). Só cadastro por enquanto; alocar equipe a um evento
-- específico fica para uma etapa futura.
-- ---------------------------------------------------------------------
CREATE TABLE public.funcionarios (
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
CREATE POLICY "funcionarios: isolamento por empresa" ON public.funcionarios FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));
