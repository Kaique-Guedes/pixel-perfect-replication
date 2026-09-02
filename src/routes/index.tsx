import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/app/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Festeja — Gestão para Buffets e Eventos" },
      { name: "description", content: "Centralize clientes, agenda, orçamentos e financeiro do seu buffet em um só lugar." },
      { property: "og:title", content: "Festeja — Gestão para Buffets e Eventos" },
      { property: "og:description", content: "Centralize clientes, agenda, orçamentos e financeiro do seu buffet em um só lugar." },
    ],
  }),
  component: Index,
});

// Rota raiz: apenas decide para onde mandar o usuário.
function Index() {
  const { user, perfil, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) void navigate({ to: "/auth", replace: true });
    else if (!perfil) void navigate({ to: "/onboarding", replace: true });
    else void navigate({ to: "/app", replace: true });
  }, [user, perfil, loading, navigate]);

  return (
    <div className="auth-backdrop flex min-h-screen items-center justify-center">
      <div className="animate-fade-up flex flex-col items-center gap-4">
        <Logo size="lg" />
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    </div>
  );
}
