-- =====================================================================
-- Novas unidades de medida: dúzia e cento.
--
-- Seguem a mesma regra das outras unidades: o preço do insumo é por
-- dúzia/cento e a quantidade por convidado (ficha técnica, estrutura,
-- materiais do evento) é informada na mesma unidade — ex.: salgado a
-- R$ 90,00 o cento, 0,1 cento (= 10 un) por convidado.
-- =====================================================================
ALTER TYPE public.unidade_medida ADD VALUE IF NOT EXISTS 'duzia';
ALTER TYPE public.unidade_medida ADD VALUE IF NOT EXISTS 'cento';
