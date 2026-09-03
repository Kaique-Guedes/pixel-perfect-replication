import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { calcularCustoItemCardapio, formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/app/PageHeader";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Festeja" }] }),
  component: RelatoriosPage,
});

const STATUS_VENDIDO = ["contrato_assinado", "confirmado", "realizado"];
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const chartConfig = {
  eventos: { label: "Eventos", color: "var(--chart-1)" },
  faturamento: { label: "Faturamento", color: "var(--chart-2)" },
} satisfies ChartConfig;

function RelatoriosPage() {
  const { empresa } = useAuth();
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const markup = empresa?.markup_padrao ?? 100;

  const { data: eventos = [], isLoading } = useQuery({
    queryKey: ["relatorios-eventos", ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("id, data, status, convidados_estimados")
        .gte("data", `${ano}-01-01`)
        .lte("data", `${ano}-12-31`);
      if (error) throw error;
      return data;
    },
  });

  const { data: itensPorEvento = [] } = useQuery({
    queryKey: ["relatorios-itens", ano],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evento_cardapio_itens")
        .select("evento_id, itens_cardapio(nome, itens_cardapio_ingredientes(quantidade_por_convidado, ingredientes(preco_unidade)))");
      if (error) throw error;
      return data;
    },
  });

  const { data: avulsos = [] } = useQuery({
    queryKey: ["relatorios-avulsos", ano],
    queryFn: async () => {
      const { data, error } = await supabase.from("orcamento_itens_avulsos").select("evento_id, tipo, valor");
      if (error) throw error;
      return data;
    },
  });

  const eventosVendidos = eventos.filter((e) => STATUS_VENDIDO.includes(e.status));
  const taxaConversao = eventos.length > 0 ? (eventosVendidos.length / eventos.length) * 100 : 0;

  const dadosPorMes = useMemo(() => {
    const meses = MESES.map((label, idx) => ({ mes: label, idx, eventos: 0, faturamento: 0 }));
    for (const evento of eventos) {
      const mesIdx = Number(evento.data.slice(5, 7)) - 1;
      meses[mesIdx].eventos += 1;
      if (STATUS_VENDIDO.includes(evento.status)) {
        const itens = itensPorEvento.filter((i) => i.evento_id === evento.id);
        const cardapio = itens.reduce((s, i) => {
          if (!i.itens_cardapio) return s;
          const { precoVendaConvidado } = calcularCustoItemCardapio(i.itens_cardapio.itens_cardapio_ingredientes, markup);
          return s + precoVendaConvidado;
        }, 0) * evento.convidados_estimados;
        const itensAvulsos = avulsos.filter((a) => a.evento_id === evento.id);
        const totalAvulsos = itensAvulsos.reduce((s, a) => s + (a.tipo === "por_convidado" ? a.valor * evento.convidados_estimados : a.valor), 0);
        meses[mesIdx].faturamento += cardapio + totalAvulsos;
      }
    }
    return meses;
  }, [eventos, itensPorEvento, avulsos, markup]);

  const faturamentoTotal = dadosPorMes.reduce((s, m) => s + m.faturamento, 0);

  const rankingItens = useMemo(() => {
    const idsVendidos = new Set(eventosVendidos.map((e) => e.id));
    const contagem = new Map<string, number>();
    for (const linha of itensPorEvento) {
      if (!idsVendidos.has(linha.evento_id) || !linha.itens_cardapio) continue;
      const nome = linha.itens_cardapio.nome;
      contagem.set(nome, (contagem.get(nome) ?? 0) + 1);
    }
    return Array.from(contagem.entries())
      .map(([nome, vezes]) => ({ nome, vezes }))
      .sort((a, b) => b.vezes - a.vezes)
      .slice(0, 10);
  }, [itensPorEvento, eventosVendidos]);

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="Eventos, conversão, faturamento e itens mais vendidos"
        actions={
          <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[anoAtual, anoAtual - 1, anoAtual - 2].map((a) => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="surface-card p-5">
          <p className="text-3xl font-medium font-display">{eventos.length}</p>
          <p className="text-sm text-muted-foreground">Eventos em {ano}</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-3xl font-medium font-display">{taxaConversao.toFixed(0)}%</p>
          <p className="text-sm text-muted-foreground">Conversão orçamento → contrato</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-3xl font-medium font-display">{formatCurrency(faturamentoTotal)}</p>
          <p className="text-sm text-muted-foreground">Faturamento no ano</p>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <section className="surface-card p-5">
          <h2 className="mb-4 text-lg font-medium">Eventos por mês</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
              <BarChart data={dadosPorMes}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="eventos" fill="var(--color-eventos)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </section>

        <section className="surface-card p-5">
          <h2 className="mb-4 text-lg font-medium">Faturamento por mês</h2>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
              <BarChart data={dadosPorMes}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="mes" tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatCurrency(Number(v))} />} />
                <Bar dataKey="faturamento" fill="var(--color-faturamento)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </section>
      </div>

      <section className="surface-card p-5">
        <h2 className="mb-4 text-lg font-medium">Itens de cardápio mais vendidos</h2>
        {rankingItens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento com contrato assinado ainda em {ano}.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Prato</TableHead>
                <TableHead className="text-right">Eventos em que apareceu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankingItens.map((i, idx) => (
                <TableRow key={i.nome}>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell className="font-medium">{i.nome}</TableCell>
                  <TableCell className="text-right">{i.vezes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </>
  );
}
