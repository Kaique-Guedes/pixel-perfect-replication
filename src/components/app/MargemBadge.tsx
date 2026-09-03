import { badge } from "@/components/app/StatusBadge";
import { corMargem } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Selo de margem em tempo real (verde ≥ alvo, amarelo ≥ mínima, vermelho
 * abaixo do mínimo aceitável), visível só para a equipe — nunca para o
 * cliente final.
 */
export function MargemBadge({
  margem,
  margemAlvo,
  margemMinima,
  className,
}: {
  margem: number;
  margemAlvo: number;
  margemMinima: number;
  className?: string;
}) {
  const tone = corMargem(margem, margemAlvo, margemMinima);
  return (
    <span className={cn(badge({ tone }), className)}>
      <span className="size-1.5 rounded-full bg-current" />
      Margem {(margem * 100).toFixed(0)}%
    </span>
  );
}
