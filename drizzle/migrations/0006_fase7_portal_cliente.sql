-- =====================================================================
-- FASE 7: portal do cliente (módulo 9) — link público por evento, sem
-- login, via token na URL.
--
-- Como o portal é acessado sem autenticação (role "anon" do
-- Supabase), as políticas de RLS baseadas em auth.uid() (todas as
-- anteriores) não liberam nada para ele — e é assim que tem que ser,
-- não queremos abrir a tabela eventos inteira para anônimos. Em vez
-- disso, expomos só o necessário através de funções SECURITY DEFINER
-- que recebem o token e devolvem exclusivamente os campos seguros
-- para o cliente final ver: nada de ficha técnica, custo de
-- ingrediente, margem ou dados de outros eventos/empresas.
-- =====================================================================

ALTER TABLE public.eventos ADD COLUMN portal_token UUID NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX eventos_portal_token_idx ON public.eventos(portal_token);

CREATE OR REPLACE FUNCTION public.portal_evento(_token UUID)
RETURNS TABLE (
  titulo TEXT,
  data DATE,
  hora_inicio TIME,
  hora_fim TIME,
  local TEXT,
  convidados_estimados INTEGER,
  status public.evento_status,
  cliente_nome TEXT,
  empresa_nome TEXT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.titulo, e.data, e.hora_inicio, e.hora_fim, e.local, e.convidados_estimados, e.status,
         c.nome, emp.nome
  FROM public.eventos e
  LEFT JOIN public.clientes c ON c.id = e.cliente_id
  JOIN public.empresas emp ON emp.id = e.empresa_id
  WHERE e.portal_token = _token
$$;
GRANT EXECUTE ON FUNCTION public.portal_evento(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.portal_evento_cardapio(_token UUID)
RETURNS TABLE (
  nome TEXT,
  categoria public.categoria_item_cardapio
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ic.nome, ic.categoria
  FROM public.evento_cardapio_itens eci
  JOIN public.itens_cardapio ic ON ic.id = eci.item_cardapio_id
  JOIN public.eventos e ON e.id = eci.evento_id
  WHERE e.portal_token = _token
  ORDER BY ic.categoria, ic.nome
$$;
GRANT EXECUTE ON FUNCTION public.portal_evento_cardapio(UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.portal_parcelas(_token UUID)
RETURNS TABLE (
  descricao TEXT,
  valor NUMERIC,
  data_vencimento DATE,
  status public.status_parcela
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.descricao, p.valor, p.data_vencimento, p.status
  FROM public.parcelas p
  JOIN public.eventos e ON e.id = p.evento_id
  WHERE e.portal_token = _token
  ORDER BY p.data_vencimento
$$;
GRANT EXECUTE ON FUNCTION public.portal_parcelas(UUID) TO anon, authenticated;
