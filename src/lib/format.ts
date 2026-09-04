import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Enums } from "@/integrations/supabase/types";

export const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export const formatDate = (d: string | Date, pattern = "dd/MM/yyyy") =>
  format(typeof d === "string" ? parseISO(d) : d, pattern, { locale: ptBR });

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
};

export const CATEGORIA_INGREDIENTE: Record<Enums<"categoria_ingrediente">, string> = {
  proteina: "Proteína",
  bebida: "Bebida",
  descartavel: "Descartável",
  decoracao: "Decoração",
  outro: "Outro",
};

export const CATEGORIA_ITEM_CARDAPIO: Record<Enums<"categoria_item_cardapio">, string> = {
  entrada: "Entrada",
  prato_principal: "Prato principal",
  sobremesa: "Sobremesa",
  bebida: "Bebida",
};

/**
 * Custo, preço de venda e margem por convidado de um item de cardápio,
 * a partir da ficha técnica (ingrediente × quantidade por convidado) e
 * do markup configurado pela empresa. Recalculado no cliente sempre
 * que a ficha técnica ou o preço de um ingrediente mudam — nunca
 * fica armazenado no banco (evita ficar desatualizado).
 */
export function calcularCustoItemCardapio(
  ficha: { quantidade_por_convidado: number; ingredientes: { preco_unidade: number } | null }[],
  markupPadrao: number,
) {
  const custoConvidado = ficha.reduce(
    (soma, f) => soma + f.quantidade_por_convidado * (f.ingredientes?.preco_unidade ?? 0),
    0,
  );
  const precoVendaConvidado = custoConvidado * (1 + markupPadrao / 100);
  const margem = precoVendaConvidado > 0 ? (precoVendaConvidado - custoConvidado) / precoVendaConvidado : 0;
  return { custoConvidado, precoVendaConvidado, margem };
}

export function corMargem(margem: number, margemAlvo: number, margemMinima: number): "success" | "warning" | "destructive" {
  const pct = margem * 100;
  if (pct >= margemAlvo) return "success";
  if (pct >= margemMinima) return "warning";
  return "destructive";
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
  return parcela.status === "pendente" && parcela.data_vencimento < format(new Date(), "yyyy-MM-dd");
}
