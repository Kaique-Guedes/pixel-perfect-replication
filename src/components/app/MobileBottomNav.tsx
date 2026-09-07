import { Link, useLocation } from "@tanstack/react-router";
import { CalendarDays, LayoutDashboard, Menu, Users, Wallet } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const ITENS = [
  { to: "/app", label: "Painel", icon: LayoutDashboard, exact: true },
  { to: "/app/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/app/clientes", label: "Clientes", icon: Users },
  { to: "/app/financeiro", label: "Financeiro", icon: Wallet },
] as const;

/**
 * Navegação inferior fixa, só no celular (sm:hidden). Os 4 itens mais
 * usados ficam a um toque; o resto do menu (Ingredientes, Cardápio,
 * Configurações...) continua acessível pelo botão "Mais", que abre a
 * mesma gaveta lateral (Sheet) já usada no desktop colapsado.
 */
export function MobileBottomNav() {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t bg-sidebar text-sidebar-foreground pb-[env(safe-area-inset-bottom)] sm:hidden print:hidden"
      aria-label="Navegação principal"
    >
      {ITENS.map((item) => {
        const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium",
              active ? "text-sidebar-primary" : "text-sidebar-foreground/70",
            )}
          >
            <item.icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => setOpenMobile(true)}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium text-sidebar-foreground/70"
      >
        <Menu className="size-5" />
        Mais
      </button>
    </nav>
  );
}
