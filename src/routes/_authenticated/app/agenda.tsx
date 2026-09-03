import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { endOfMonth, format, isSameDay, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarPlus, MapPin, Receipt, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatHora } from "@/lib/format";
import { PageHeader } from "@/components/app/PageHeader";
import { EventoStatusBadge } from "@/components/app/StatusBadge";
import { EventoDialog, type Evento } from "@/components/app/EventoDialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";

export const Route = createFileRoute("/_authenticated/app/agenda")({
  head: () => ({ meta: [{ title: "Agenda — Festeja" }] }),
  component: AgendaPage,
});

function AgendaPage() {
  const navigate = useNavigate();
  const [mes, setMes] = useState(startOfMonth(new Date()));
  const [selecionado, setSelecionado] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [eventoAtivo, setEventoAtivo] = useState<Evento | null>(null);

  const inicioMes = format(startOfMonth(mes), "yyyy-MM-dd");
  const fimMes = format(endOfMonth(mes), "yyyy-MM-dd");

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["eventos", inicioMes, fimMes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("*, clientes(nome)")
        .gte("data", inicioMes)
        .lte("data", fimMes)
        .order("data")
        .order("hora_inicio");
      if (error) throw error;
      return data;
    },
  });

  const diasComEvento = useMemo(() => eventos.map((e) => parseISO(e.data)), [eventos]);

  const eventosDoDia = useMemo(
    () => eventos.filter((e) => isSameDay(parseISO(e.data), selecionado)),
    [eventos, selecionado],
  );

  const abrirNovo = () => {
    setEventoAtivo(null);
    setDialogOpen(true);
  };

  const abrirEdicao = (e: Evento) => {
    setEventoAtivo(e);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Datas com bloqueio automático contra overbooking"
        actions={
          <Button onClick={abrirNovo}>
            <CalendarPlus /> Novo evento
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="surface-card w-fit p-3">
          <Calendar
            mode="single"
            locale={ptBR}
            month={mes}
            onMonthChange={setMes}
            selected={selecionado}
            onSelect={(d) => d && setSelecionado(d)}
            modifiers={{ hasEvent: diasComEvento }}
            modifiersClassNames={{ hasEvent: "after:absolute after:bottom-1 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary" }}
          />
        </div>

        <div className="surface-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">{formatDate(selecionado, "EEEE, d 'de' MMMM")}</h2>
            <span className="text-sm text-muted-foreground">
              {eventosDoDia.length} evento{eventosDoDia.length === 1 ? "" : "s"}
            </span>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : eventosDoDia.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">Nenhum evento nesta data.</p>
              <Button variant="outline" className="mt-4" onClick={abrirNovo}>
                <CalendarPlus /> Criar evento para este dia
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {eventosDoDia.map((e) => (
                <li
                  key={e.id}
                  className="flex cursor-pointer flex-wrap items-center gap-3 py-3"
                  onClick={() => abrirEdicao(e)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{e.titulo}</p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{formatHora(e.hora_inicio)}–{formatHora(e.hora_fim)}</span>
                      {e.local && (
                        <span className="flex items-center gap-1"><MapPin className="size-3" /> {e.local}</span>
                      )}
                      <span className="flex items-center gap-1"><Users className="size-3" /> {e.convidados_estimados}</span>
                      {e.clientes?.nome && <span>{e.clientes.nome}</span>}
                    </p>
                  </div>
                  <Link
                    to="/app/agenda/$eventoId"
                    params={{ eventoId: e.id }}
                    onClick={(ev) => ev.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Receipt className="size-3.5" /> Orçamento
                  </Link>
                  <EventoStatusBadge status={e.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <EventoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        evento={eventoAtivo}
        defaults={{ data: format(selecionado, "yyyy-MM-dd") }}
        onSaved={({ id, isNew }) => {
          if (isNew) void navigate({ to: "/app/agenda/$eventoId", params: { eventoId: id } });
        }}
      />
    </>
  );
}
