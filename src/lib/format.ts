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
