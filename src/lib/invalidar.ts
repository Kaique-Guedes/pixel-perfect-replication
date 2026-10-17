import type { QueryClient } from "@tanstack/react-query";

/**
 * Tudo que entra no custo de um orçamento: preço de ingrediente/material,
 * ficha técnica, valor/hora de funcionário, composição de equipe/estrutura
 * e os vínculos de cada evento (que trazem esses dados embutidos).
 *
 * Mudou qualquer um desses cadastros → invalida tudo, senão a tela do
 * evento continua mostrando o custo antigo (o cache vale 60s) e o total
 * não bate com o que aparece em Cardápio/Ingredientes.
 */
const CHAVES_DE_CUSTO = [
  "ingredientes",
  "materiais",
  "itens-cardapio",
  "ficha-tecnica",
  "funcionarios",
  "equipes",
  "equipe-funcionarios",
  "estruturas",
  "estrutura-materiais",
  "evento-cardapio-itens",
  "evento-materiais",
  "evento-equipes",
  "evento-estruturas",
] as const;

export function invalidarCustos(qc: QueryClient) {
  for (const chave of CHAVES_DE_CUSTO) void qc.invalidateQueries({ queryKey: [chave] });
}
