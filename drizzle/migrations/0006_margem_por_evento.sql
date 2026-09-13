-- =====================================================================
-- Muda o modelo de margem: de um markup fixo por empresa (Configurações)
-- para uma margem de lucro definida por evento, aplicada sobre o custo
-- total do orçamento (cardápio + itens avulsos) daquele evento
-- especificamente. Cada orçamento pode ter uma margem diferente.
--
-- markup_padrao / margem_alvo / margem_minima em "empresas" (Fase 1)
-- deixam de ser usados pela aplicação a partir daqui, mas as colunas
-- não são removidas — evita perda de dado e mantém a migração
-- reversível sem custo.
-- =====================================================================

ALTER TABLE public.eventos ADD COLUMN margem_lucro NUMERIC(5,2) NOT NULL DEFAULT 30;
