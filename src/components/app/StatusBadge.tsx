import { cva } from "class-variance-authority";
import type { Enums } from "@/integrations/supabase/types";
import { CLIENTE_STATUS, EVENTO_STATUS } from "@/lib/format";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        info: "bg-info/12 text-info",
        warning: "bg-warning/25 text-warning-foreground",
        success: "bg-success/15 text-success",
        primary: "bg-primary/12 text-primary",
        destructive: "bg-destructive/12 text-destructive",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

const CLIENTE_TONE: Record<Enums<"cliente_status">, Parameters<typeof badge>[0]["tone"]> = {
  novo_lead: "info",
  em_negociacao: "warning",
  cliente_ativo: "success",
  perdido: "neutral",
};

export const EVENTO_TONE: Record<Enums<"evento_status">, Parameters<typeof badge>[0]["tone"]> = {
  orcamento: "warning",
  contrato_assinado: "info",
  confirmado: "success",
  realizado: "neutral",
  cancelado: "destructive",
};

export function ClienteStatusBadge({ status, className }: { status: Enums<"cliente_status">; className?: string }) {
  return (
    <span className={cn(badge({ tone: CLIENTE_TONE[status] }), className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {CLIENTE_STATUS[status]}
    </span>
  );
}

export function EventoStatusBadge({ status, className }: { status: Enums<"evento_status">; className?: string }) {
  return (
    <span className={cn(badge({ tone: EVENTO_TONE[status] }), className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {EVENTO_STATUS[status]}
    </span>
  );
}
