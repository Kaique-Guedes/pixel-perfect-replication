import { badge } from "@/components/app/StatusBadge";
import { cn } from "@/lib/utils";

/**
 * Selo mostrando a margem de lucro definida para o orçamento (valor
 * direto, escolhido pela usuária por evento — não é mais comparado
 * contra uma meta configurável).
 */
export function MargemBadge({ margem, className }: { margem: number; className?: string }) {
  return (
    <span className={cn(badge({ tone: "primary" }), className)}>
      <span className="size-1.5 rounded-full bg-current" />
      Margem {margem.toFixed(0)}%
    </span>
  );
}
