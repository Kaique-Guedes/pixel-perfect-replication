-- Índices complementares para consultas do financeiro e do orçamento.
-- (Esta migração também dispara a aplicação das migrações pendentes 0001–0003.)
CREATE INDEX IF NOT EXISTS parcelas_empresa_status_idx ON public.parcelas(empresa_id, status);
CREATE INDEX IF NOT EXISTS despesas_empresa_data_idx ON public.despesas(empresa_id, data);
CREATE INDEX IF NOT EXISTS orcamento_itens_avulsos_empresa_idx ON public.orcamento_itens_avulsos(empresa_id);