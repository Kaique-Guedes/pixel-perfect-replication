-- =====================================================================
-- Adiciona telefone e endereço à empresa (dados de contato exibidos
-- futuramente no portal do cliente — módulo 9 — e usados em
-- Configurações).
-- =====================================================================

ALTER TABLE public.empresas ADD COLUMN telefone TEXT;
ALTER TABLE public.empresas ADD COLUMN endereco TEXT;
