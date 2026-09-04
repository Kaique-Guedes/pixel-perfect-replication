import logoCompleta from "@/assets/logo-amor-tempero.png";
import logoIcone from "@/assets/logo-icon.png";
import { cn } from "@/lib/utils";

export function Logo({ size = "md", variant = "default", className }: { size?: "sm" | "md" | "lg"; variant?: "default" | "sidebar"; className?: string }) {
  const alturaCompleta = size === "lg" ? "h-24" : size === "sm" ? "h-12" : "h-14";
  const alturaIcone = size === "lg" ? "size-16" : size === "sm" ? "size-10" : "size-12";

  return (
    <div className={cn("flex items-center", className)}>
      {/* Logo completa (ícone + nome) — visível por padrão */}
      <img
        src={logoCompleta}
        alt="Amor & Tempero Festas"
        className={cn(alturaCompleta, "w-auto object-contain", variant === "sidebar" && "group-data-[collapsible=icon]:hidden")}
      />
      {/* Só a panela — aparece quando a sidebar colapsa para modo ícone */}
      {variant === "sidebar" && (
        <img
          src={logoIcone}
          alt="Amor & Tempero Festas"
          className={cn(alturaIcone, "hidden w-auto object-contain group-data-[collapsible=icon]:block")}
        />
      )}
    </div>
  );
}
