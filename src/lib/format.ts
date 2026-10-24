import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Enums } from "@/integrations/supabase/types";

/**
 * Arredonda um valor em reais para centavos. Todo subtotal exibido na
 * tela passa por aqui antes de ser somado, para que a soma das linhas
 * bata exatamente com o total mostrado (sem diferença de centavos).
 */
export const arredondarMoeda = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

export const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

/** Quantidade no padrão brasileiro (vírgula decimal): 0.5 → "0,5". */
export const formatQuantidade = (v: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(v);

export const formatDate = (d: string | Date, pattern = "dd/MM/yyyy") =>
  format(typeof d === "string" ? parseISO(d) : d, pattern, { locale: ptBR });

/** Data de hoje (yyyy-MM-dd) no fuso do usuário — não usar toISOString(), que é UTC. */
export const hojeISO = () => format(new Date(), "yyyy-MM-dd");

export const formatHora = (t: string) => t.slice(0, 5);

export const CLIENTE_STATUS: Record<Enums<"cliente_status">, string> = {
  novo_lead: "Novo lead",
  em_negociacao: "Em negociação",
  cliente_ativo: "Cliente ativo",
  perdido: "Perdido",
};

export const EVENTO_STATUS: Record<Enums<"evento_status">, string> = {
  orcamento: "Orçamento",
  contrato_assinado: "Contrato assinado",
  confirmado: "Confirmado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

export const TIPO_NEGOCIO: Record<Enums<"tipo_negocio">, string> = {
  buffet: "Buffet",
  casa_de_festas: "Casa de festas",
  cerimonial: "Cerimonial",
  produtora: "Produtora de eventos",
};

export const ORIGENS_LEAD = [
  "Instagram",
  "WhatsApp",
  "Indicação",
  "Google",
  "Facebook",
  "Site",
  "Evento anterior",
  "Outro",
];

/** Status que travam a agenda (regra de overbooking) */
export const STATUS_BLOQUEIA_AGENDA: Enums<"evento_status">[] = ["contrato_assinado", "confirmado"];

export const UNIDADE_MEDIDA: Record<Enums<"unidade_medida">, string> = {
  kg: "kg",
  g: "g",
  litro: "litro",
  ml: "ml",
  unidade: "unidade",
  duzia: "dúzia",
  cento: "cento",
};

export const CATEGORIA_INGREDIENTE: Record<Enums<"categoria_ingrediente">, string> = {
  proteina: "Proteína",
  bebida: "Bebida",
  descartavel: "Descartável",
  decoracao: "Decoração",
  outro: "Outro",
};

export const TIPO_INSUMO: Record<Enums<"tipo_insumo">, string> = {
  ingrediente: "Ingrediente",
  material: "Material",
};

export const CATEGORIA_ITEM_CARDAPIO: Record<Enums<"categoria_item_cardapio">, string> = {
  entrada: "Entrada",
  prato_principal: "Prato principal",
  sobremesa: "Sobremesa",
  bebida: "Bebida",
};

/**
 * Custo de um item de cardápio a partir da ficha técnica.
 *
 * A ficha guarda as quantidades da RECEITA e o item diz quantos
 * convidados ela serve (rendimento). Custo por convidado = custo da
 * receita / rendimento. Rendimento 1 = quantidades já por convidado
 * (como eram os pratos antigos).
 *
 * Recalculado no cliente sempre que a ficha ou um preço muda — nunca
 * fica armazenado no banco. Não inclui margem (ela é por evento).
 */
export function calcularCustoItemCardapio(
  ficha: { quantidade_por_convidado: number; ingredientes: { preco_unidade: number } | null }[],
  rendimento = 1,
) {
  const custoReceita = ficha.reduce(
    (soma, f) => soma + f.quantidade_por_convidado * (f.ingredientes?.preco_unidade ?? 0),
    0,
  );
  return { custoReceita, custoConvidado: custoReceita / rendimentoValido(rendimento) };
}

/** Rendimento inválido (0, vazio, negativo) conta como 1 para não dividir por zero. */
export const rendimentoValido = (r: number | null | undefined) => (r && r > 0 ? r : 1);

/** Aplica a margem de lucro (%) do evento sobre um valor de custo. */
export function calcularValorComMargem(custo: number, margemLucroPct: number) {
  return arredondarMoeda(custo * (1 + margemLucroPct / 100));
}

/** Custo total de uma composição de equipe: soma de horas × valor/hora de cada funcionário. */
export function calcularCustoEquipe(linhas: { horas: number; funcionarios: { valor_hora: number } | null }[]) {
  return linhas.reduce((soma, l) => soma + l.horas * (l.funcionarios?.valor_hora ?? 0), 0);
}

/**
 * Custo por convidado de uma estrutura: (soma de quantidade × preço de
 * cada material) / quantos convidados ela atende (rendimento).
 */
export function calcularCustoEstrutura(
  linhas: { quantidade_por_convidado: number; ingredientes: { preco_unidade: number } | null }[],
  rendimento = 1,
) {
  const total = linhas.reduce((soma, l) => soma + l.quantidade_por_convidado * (l.ingredientes?.preco_unidade ?? 0), 0);
  return total / rendimentoValido(rendimento);
}

/** Subtotal (já em centavos) de algo cobrado por convidado. */
export const subtotalPorConvidado = (custoConvidado: number, convidados: number) =>
  arredondarMoeda(custoConvidado * convidados);

/** Subtotal (já em centavos) de um item avulso. */
export const subtotalAvulso = (a: { tipo: Enums<"tipo_item_avulso">; valor: number }, convidados: number) =>
  a.tipo === "por_convidado" ? subtotalPorConvidado(a.valor, convidados) : arredondarMoeda(a.valor);

const somarMoeda = (valores: number[]) => arredondarMoeda(valores.reduce((s, v) => s + v, 0));

/**
 * Fonte única do cálculo do orçamento de um evento — usada tanto na tela
 * do evento quanto no diálogo de criar/editar, para os dois mostrarem
 * exatamente o mesmo total. Cada linha é arredondada para centavos antes
 * de somar, então o "Custo total" é sempre a soma do que aparece na tela.
 */
export function calcularResumoOrcamento(dados: {
  convidados: number;
  margemLucroPct: number;
  itensCardapio: { custoConvidado: number }[];
  materiais: { quantidade_por_convidado: number; ingredientes: { preco_unidade: number } | null }[];
  equipes: { custoTotal: number }[];
  estruturas: { custoConvidado: number }[];
  avulsos: { tipo: Enums<"tipo_item_avulso">; valor: number }[];
}) {
  const { convidados } = dados;
  const custoCardapio = somarMoeda(dados.itensCardapio.map((i) => subtotalPorConvidado(i.custoConvidado, convidados)));
  const custoMateriais = somarMoeda(
    dados.materiais.map((m) => subtotalPorConvidado(m.quantidade_por_convidado * (m.ingredientes?.preco_unidade ?? 0), convidados)),
  );
  const custoEquipes = somarMoeda(dados.equipes.map((e) => arredondarMoeda(e.custoTotal)));
  const custoEstruturas = somarMoeda(dados.estruturas.map((e) => subtotalPorConvidado(e.custoConvidado, convidados)));
  const custoAvulsos = somarMoeda(dados.avulsos.map((a) => subtotalAvulso(a, convidados)));
  const custoTotal = somarMoeda([custoCardapio, custoMateriais, custoEquipes, custoEstruturas, custoAvulsos]);
  const total = calcularValorComMargem(custoTotal, dados.margemLucroPct);
  const valorPorConvidado = convidados > 0 ? arredondarMoeda(total / convidados) : 0;
  return { custoCardapio, custoMateriais, custoEquipes, custoEstruturas, custoAvulsos, custoTotal, total, valorPorConvidado };
}

export const TIPO_ITEM_AVULSO: Record<Enums<"tipo_item_avulso">, string> = {
  fixo: "Valor fixo",
  por_convidado: "Por convidado",
};

export const STATUS_PARCELA: Record<Enums<"status_parcela">, string> = {
  pendente: "Pendente",
  pago: "Pago",
};

/** "Atrasada" é sempre derivado (nunca armazenado): pendente + vencimento no passado. */
export function parcelaAtrasada(parcela: { status: Enums<"status_parcela">; data_vencimento: string }) {
  return parcela.status === "pendente" && parcela.data_vencimento < hojeISO();
}
