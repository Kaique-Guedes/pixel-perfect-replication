-- =====================================================================
-- FASE 2: ingredientes, itens de cardápio (com ficha técnica) e
-- montagem de cardápio por evento — base do cálculo automático de
-- custo/margem (módulo 3). Todas as tabelas seguem o isolamento por
-- empresa_id + RLS já estabelecido na Fase 1.
-- =====================================================================

CREATE TYPE public.unidade_medida AS ENUM ('kg', 'g', 'litro', 'ml', 'unidade');
CREATE TYPE public.categoria_ingrediente AS ENUM ('proteina', 'bebida', 'descartavel', 'decoracao', 'outro');
CREATE TYPE public.categoria_item_cardapio AS ENUM ('entrada', 'prato_principal', 'sobremesa', 'bebida');

-- ---------------------------------------------------------------------
-- INGREDIENTES
-- ---------------------------------------------------------------------
CREATE TABLE public.ingredientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  unidade public.unidade_medida NOT NULL,
  preco_unidade NUMERIC(10,4) NOT NULL DEFAULT 0,
  categoria public.categoria_ingrediente NOT NULL DEFAULT 'outro',
  fornecedor TEXT,
  estoque_atual NUMERIC(12,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ingredientes_empresa_idx ON public.ingredientes(empresa_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingredientes TO authenticated;
GRANT ALL ON public.ingredientes TO service_role;
ALTER TABLE public.ingredientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ingredientes: isolamento por empresa" ON public.ingredientes FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));
CREATE TRIGGER ingredientes_updated_at_trg BEFORE UPDATE ON public.ingredientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- ITENS DE CARDÁPIO (pratos/opções)
-- ---------------------------------------------------------------------
CREATE TABLE public.itens_cardapio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria public.categoria_item_cardapio NOT NULL,
  foto_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX itens_cardapio_empresa_idx ON public.itens_cardapio(empresa_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens_cardapio TO authenticated;
GRANT ALL ON public.itens_cardapio TO service_role;
ALTER TABLE public.itens_cardapio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itens_cardapio: isolamento por empresa" ON public.itens_cardapio FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));
CREATE TRIGGER itens_cardapio_updated_at_trg BEFORE UPDATE ON public.itens_cardapio
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------
-- FICHA TÉCNICA — liga cada item de cardápio aos ingredientes que o
-- compõem, com a quantidade por convidado. É o núcleo do cálculo
-- automático de custo: custo_por_convidado(item) =
--   soma(quantidade_por_convidado × preco_unidade do ingrediente).
-- Ingrediente com FK RESTRICT: evita apagar um ingrediente que ainda
-- está em uso numa ficha técnica sem querer.
-- ---------------------------------------------------------------------
CREATE TABLE public.itens_cardapio_ingredientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  item_cardapio_id UUID NOT NULL REFERENCES public.itens_cardapio(id) ON DELETE CASCADE,
  ingrediente_id UUID NOT NULL REFERENCES public.ingredientes(id) ON DELETE RESTRICT,
  quantidade_por_convidado NUMERIC(10,4) NOT NULL,
  UNIQUE (item_cardapio_id, ingrediente_id)
);
CREATE INDEX itens_cardapio_ingredientes_item_idx ON public.itens_cardapio_ingredientes(item_cardapio_id);
CREATE INDEX itens_cardapio_ingredientes_ingrediente_idx ON public.itens_cardapio_ingredientes(ingrediente_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens_cardapio_ingredientes TO authenticated;
GRANT ALL ON public.itens_cardapio_ingredientes TO service_role;
ALTER TABLE public.itens_cardapio_ingredientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ficha_tecnica: isolamento por empresa" ON public.itens_cardapio_ingredientes FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));

-- ---------------------------------------------------------------------
-- MONTAGEM DE CARDÁPIO DO EVENTO — quais itens de cardápio entram no
-- evento. O nº de convidados já vive em eventos.convidados_estimados;
-- o valor do orçamento e o custo total são recalculados no cliente a
-- partir desta seleção + da ficha técnica + do nº de convidados,
-- nunca armazenados aqui (evita dados calculados ficarem
-- desatualizados quando o preço de um ingrediente muda).
-- ---------------------------------------------------------------------
CREATE TABLE public.evento_cardapio_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  evento_id UUID NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  item_cardapio_id UUID NOT NULL REFERENCES public.itens_cardapio(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (evento_id, item_cardapio_id)
);
CREATE INDEX evento_cardapio_itens_evento_idx ON public.evento_cardapio_itens(evento_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evento_cardapio_itens TO authenticated;
GRANT ALL ON public.evento_cardapio_itens TO service_role;
ALTER TABLE public.evento_cardapio_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evento_cardapio: isolamento por empresa" ON public.evento_cardapio_itens FOR ALL TO authenticated
  USING (empresa_id = public.get_empresa_id(auth.uid()))
  WITH CHECK (empresa_id = public.get_empresa_id(auth.uid()));
