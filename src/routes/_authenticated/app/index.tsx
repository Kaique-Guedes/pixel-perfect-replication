import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, startOfMonth, endOfMonth } from "date-fns";
import { ArrowRight, CalendarDays, Sparkles, UserPlus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatHora } from "@/lib/format";
import { PageHeader } from "@/components/app/PageHeader";
import { EventoStatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Painel — Festeja" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { perfil } = useAuth();
  const hoje = format(new Date(), "yyyy-MM-dd");
  const em7 = format(addDays(new Date(), 7), "yyyy-MM-dd");
  const iniMes = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const fimMes = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const { data } = useQuery({
    queryKey: ["dashboard", hoje],
    queryFn: async () => {
      const [clientes, leads, proximos, mes] = await Promise.all([
        supabase.from("clientes").select("id", { count: "exact", head: true }),
        supabase.from("clientes").select("id", { count: "exact", head: true }).in("status", ["novo_lead", "em_negociacao"]),
        supabase.from("eventos").select("*, clientes(nome)").gte("data", hoje).lte("data", em7).neq("status", "cancelado").order("data").order("hora_inicio"),
        supabase.from("eventos").select("id, status", { count: "exact" }).gte("data", iniMes).lte("data", fimMes).in("status", ["contrato_assinado", "confirmado", "realizado"]),
      ]);
      return {
        clientes: clientes.count ?? 0,
        leads: leads.count ?? 0,
        proximos: proximos.data ?? [],
        eventosMes: mes.count ?? 0,
      };
    },
  });

  const cards = [
    { label: "Clientes cadastrados", value: data?.clientes ?? "—", icon: Users, to: "/app/clientes" as const },
    { label: "Leads em aberto", value: data?.leads ?? "—", icon: Sparkles, to: "/app/clientes" as const },
    { label: "Eventos fechados no mês", value: data?.eventosMes ?? "—", icon: CalendarDays, to: "/app/agenda" as const },
  ];

  return (
    <>
      <PageHeader
        title={`Olá, ${perfil?.nome.split(" ")[0]}`}
        description={formatDate(new Date(), "EEEE, d 'de' MMMM")}
        actions={
          <>
            <Button variant="outline" asChild><Link to="/app/clientes"><UserPlus /> Novo cliente</Link></Button>
            <Button asChild><Link to="/app/agenda"><CalendarDays /> Agenda</Link></Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="surface-card group p-5 transition-shadow hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"><c.icon className="size-4" /></span>
              <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-4 text-3xl font-medium font-display">{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </Link>
        ))}
      </div>

      <section className="surface-card mt-6 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">Próximos 7 dias</h2>
          <Link to="/app/agenda" className="text-sm text-primary hover:underline">Ver agenda</Link>
        </div>
        {!data ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : data.proximos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento nos próximos dias. Que tal prospectar novos leads?</p>
        ) : (
          <ul className="divide-y">
            {data.proximos.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="flex w-14 flex-col items-center rounded-lg bg-muted py-1.5 leading-tight">
                  <span className="text-xs uppercase text-muted-foreground">{formatDate(e.data, "MMM")}</span>
                  <span className="text-lg font-semibold">{formatDate(e.data, "dd")}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatHora(e.hora_inicio)}–{formatHora(e.hora_fim)}
                    {e.local ? ` · ${e.local}` : ""}
                    {e.clientes?.nome ? ` · ${e.clientes.nome}` : ""}
                  </p>
                </div>
                <EventoStatusBadge status={e.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
