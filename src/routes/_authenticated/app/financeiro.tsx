import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { endOfMonth, startOfMonth } from "date-fns";
import { AlertTriangle, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate, parcelaAtrasada } from "@/lib/format";
import { PageHeader } from "@/components/app/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/app/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Festeja" }] }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const hoje = new Date();
  const inicioMes = startOfMonth(hoje).toISOString().slice(0, 10);
  const fimMes = endOfMonth(hoje).toISOString().slice(0, 10);

  const { data: parcelas = [], isLoading } = useQuery({
    queryKey: ["financeiro", "parcelas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parcelas")
        .select("*, eventos(titulo)")
        .order("data_vencimento");
      if (error) throw error;
      return data;
    },
  });

  const totalReceberMes = useMemo(
    () => parcelas.filter((p) => p.status === "pendente" && p.data_vencimento >= inicioMes && p.data_vencimento <= fimMes).reduce((s, p) => s + p.valor, 0),
    [parcelas, inicioMes, fimMes],
  );

  const totalRecebidoMes = useMemo(
    () => parcelas.filter((p) => p.status === "pago" && (p.data_pagamento ?? "") >= inicioMes && (p.data_pagamento ?? "") <= fimMes).reduce((s, p) => s + p.valor, 0),
    [parcelas, inicioMes, fimMes],
  );

  const parcelasAtrasadas = useMemo(() => parcelas.filter(parcelaAtrasada), [parcelas]);

  const cards = [
    { label: "A receber este mês", value: formatCurrency(totalReceberMes), icon: Wallet, tone: "text-foreground" },
    { label: "Recebido este mês", value: formatCurrency(totalRecebidoMes), icon: TrendingUp, tone: "text-success" },
    { label: "Parcelas atrasadas", value: String(parcelasAtrasadas.length), icon: TrendingDown, tone: "text-destructive" },
  ];

  return (
    <>
      <PageHeader title="Financeiro" description="Visão geral de parcelas a receber, recebidas e atrasadas" />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="surface-card p-5">
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground"><c.icon className="size-4" /></span>
            </div>
            <p className={`mt-4 text-3xl font-medium font-display ${c.tone}`}>{c.value}</p>
            <p className="text-sm text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <section className="surface-card p-5">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" />
          <h2 className="text-lg font-medium">Eventos com parcelas atrasadas</h2>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : parcelasAtrasadas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma parcela atrasada. 🎉</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parcelasAtrasadas.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link to="/app/agenda/$eventoId" params={{ eventoId: p.evento_id }} className="hover:underline">
                      {p.eventos?.titulo ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.descricao || "—"}</TableCell>
                  <TableCell className="text-destructive">{formatDate(p.data_vencimento)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(p.valor)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </>
  );
}
