-- =====================================================================
-- Rendimento de pratos e estruturas.
--
-- Até aqui a ficha técnica pedia a quantidade POR CONVIDADO. Na prática
-- quem cozinha pensa em receita: "1 kg de frango + 1 abacaxi rendem patê
-- para 50 pessoas". Com o rendimento, a ficha guarda as quantidades da
-- receita inteira e o custo por convidado = custo da receita / rendimento.
--
-- Mesmo raciocínio para estruturas ("40 cadeiras e 5 mesas atendem 40
-- convidados").
--
-- Default 1 = comportamento antigo (quantidades por convidado), então
-- nenhum prato ou estrutura já cadastrado muda de valor.
-- =====================================================================
ALTER TABLE public.itens_cardapio ADD COLUMN IF NOT EXISTS rendimento INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.estruturas ADD COLUMN IF NOT EXISTS rendimento INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'itens_cardapio_rendimento_positivo') THEN
    ALTER TABLE public.itens_cardapio ADD CONSTRAINT itens_cardapio_rendimento_positivo CHECK (rendimento > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'estruturas_rendimento_positivo') THEN
    ALTER TABLE public.estruturas ADD CONSTRAINT estruturas_rendimento_positivo CHECK (rendimento > 0);
  END IF;
END $$;
