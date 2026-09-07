import { PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ size = "md", variant = "default", className }: { size?: "sm" | "md" | "lg"; variant?: "default" | "sidebar"; className?: string }) {
  const iconSize = size === "lg" ? "size-12 [&_svg]:size-6" : size === "sm" ? "size-8 [&_svg]:size-4" : "size-10 [&_svg]:size-5";
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex items-center justify-center rounded-xl",
          variant === "sidebar" ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-primary text-primary-foreground",
          iconSize,
        )}
      >
        <PartyPopper />
      </span>
      <span className={cn("font-display font-semibold tracking-tight", text, variant === "sidebar" ? "text-sidebar-accent-foreground" : "text-foreground")}>
        Festeja
      </span>
    </div>
  );
}
