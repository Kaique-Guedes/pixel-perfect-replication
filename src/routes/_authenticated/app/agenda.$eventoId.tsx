import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, FileDown, Lock, Plus, Trash2, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Enums } from "@/integrations/supabase/types";
import {
  CATEGORIA_ITEM_CARDAPIO,
  TIPO_ITEM_AVULSO,
  calcularCustoItemCardapio,
  formatCurrency,
  formatDate,
  formatHora,
} from "@/lib/format";
import { PageHeader } from "@/components/app/PageHeader";
import { EventoStatusBadge } from "@/components/app/StatusBadge";
import { MargemBadge } from "@/components/app/MargemBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/app/agenda/$eventoId")({
  head: () => ({ meta: [{ title: "Orçamento do evento — Festeja" }] }),
  component: EventoDetalhePage,
});

function EventoDetalhePage() {
  const { eventoId } = Route.useParams();
  const { empresa, isAdmin } = useAuth();
  const qc = useQueryClient();

  const [itemParaAdicionar, setItemParaAdicionar] = useState("");
  const [avulso, setAvulso] = useState<{ descricao: string; tipo: Enums<"tipo_item_avulso">; valor: number }>({
    descricao: "",
    tipo: "fixo",
    valor: 0,
  });

  const { data: evento, isLoading: carregandoEvento } = useQuery({
    queryKey: ["eventos", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("eventos").select("*, clientes(nome)").eq("id", eventoId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: itensEvento = [] } = useQuery({
    queryKey: ["evento-cardapio-itens", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evento_cardapio_itens")
        .select("id, item_cardapio_id, itens_cardapio(id, nome, categoria, itens_cardapio_ingredientes(quantidade_por_convidado, ingredientes(preco_unidade)))")
        .eq("evento_id", eventoId);
      if (error) throw error;
      return data;
    },
  });

  const { data: itensAvulsos = [] } = useQuery({
    queryKey: ["orcamento-itens-avulsos", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orcamento_itens_avulsos")
        .select("*")
        .eq("evento_id", eventoId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: catalogo = [] } = useQuery({
    queryKey: ["itens-cardapio"],
    queryFn: async () => {
      const { data, error } = await supabase.from("itens_cardapio").select("id, nome, categoria").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const editavel = evento?.status === "orcamento";
  const convidados = evento?.convidados_estimados ?? 0;
  const markup = empresa?.markup_padrao ?? 100;

  const itensCalculados = useMemo(
    () =>
      itensEvento
        .filter((ie) => ie.itens_cardapio)
        .map((ie) => {
          const item = ie.itens_cardapio!;
          const { custoConvidado, precoVendaConvidado } = calcularCustoItemCardapio(item.itens_cardapio_ingredientes, markup);
          return { vinculoId: ie.id, id: item.id, nome: item.nome, categoria: item.categoria, custoConvidado, precoVendaConvidado };
        }),
    [itensEvento, markup],
  );

  const custoCardapioTotal = itensCalculados.reduce((s, i) => s + i.custoConvidado, 0) * convidados;
  const subtotalCardapio = itensCalculados.reduce((s, i) => s + i.precoVendaConvidado, 0) * convidados;
  const subtotalAvulsos = itensAvulsos.reduce((s, a) => s + (a.tipo === "por_convidado" ? a.valor * convidados : a.valor), 0);
  const total = subtotalCardapio + subtotalAvulsos;
  const valorPorConvidado = convidados > 0 ? total / convidados : 0;
  const margemCardapio = subtotalCardapio > 0 ? (subtotalCardapio - custoCardapioTotal) / subtotalCardapio : 0;

  const itensDisponiveis = catalogo.filter((c) => !itensCalculados.some((i) => i.id === c.id));

  const invalidarTudo = () => {
    void qc.invalidateQueries({ queryKey: ["evento-cardapio-itens", eventoId] });
    void qc.invalidateQueries({ queryKey: ["orcamento-itens-avulsos", eventoId] });
    void qc.invalidateQueries({ queryKey: ["eventos", eventoId] });
    void qc.invalidateQueries({ queryKey: ["eventos"] });
  };

  const erroTravado = (e: Error) => {
    if (e.message.includes("ORCAMENTO_TRAVADO")) {
      toast.error("Orçamento travado", { description: "Este orçamento já virou contrato. Peça para um admin reabri-lo antes de editar." });
    } else toast.error(e.message);
  };

  const addItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("evento_cardapio_itens").insert({
        empresa_id: empresa!.id,
        evento_id: eventoId,
        item_cardapio_id: itemParaAdicionar,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setItemParaAdicionar("");
      invalidarTudo();
    },
    onError: erroTravado,
  });

  const removeItem = useMutation({
    mutationFn: async (vinculoId: string) => {
      const { error } = await supabase.from("evento_cardapio_itens").delete().eq("id", vinculoId);
      if (error) throw error;
    },
    onSuccess: invalidarTudo,
    onError: erroTravado,
  });

  const addAvulso = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("orcamento_itens_avulsos").insert({
        empresa_id: empresa!.id,
        evento_id: eventoId,
        descricao: avulso.descricao.trim(),
        tipo: avulso.tipo,
        valor: Number(avulso.valor) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAvulso({ descricao: "", tipo: "fixo", valor: 0 });
      invalidarTudo();
    },
    onError: erroTravado,
  });

  const removeAvulso = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("orcamento_itens_avulsos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidarTudo,
    onError: erroTravado,
  });

  const mudarStatus = useMutation({
    mutationFn: async (status: Enums<"evento_status">) => {
      const { error } = await supabase.from("eventos").update({ status }).eq("id", eventoId);
      if (error) throw error;
    },
    onSuccess: (_data, status) => {
      invalidarTudo();
      toast.success(status === "orcamento" ? "Orçamento reaberto para edição." : "Orçamento convertido em contrato.");
    },
    onError: (e: Error) => {
      if (e.message.includes("OVERBOOKING")) {
        toast.error("Conflito de agenda", { description: e.message.replace("OVERBOOKING: ", "") });
      } else toast.error(e.message);
    },
  });

  const submitAvulso = (e: FormEvent) => {
    e.preventDefault();
    if (!avulso.descricao.trim()) return toast.error("Descreva o item avulso.");
    addAvulso.mutate();
  };

  if (carregandoEvento) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!evento) return <p className="text-sm text-muted-foreground">Evento não encontrado.</p>;

  return (
    <>
      <div className="mb-2 print:hidden">
        <Link to="/app/agenda" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Voltar para agenda
        </Link>
      </div>

      <PageHeader
        title={evento.titulo}
        description={`${formatDate(evento.data, "EEEE, d 'de' MMMM")} · ${formatHora(evento.hora_inicio)}–${formatHora(evento.hora_fim)}${evento.local ? ` · ${evento.local}` : ""}${evento.clientes?.nome ? ` · ${evento.clientes.nome}` : ""}`}
        actions={
          <div className="flex items-center gap-2 print:hidden">
            <EventoStatusBadge status={evento.status} />
            <Button variant="outline" onClick={() => window.print()}>
              <FileDown /> Gerar PDF
            </Button>
            {editavel ? (
              <Button onClick={() => mudarStatus.mutate("contrato_assinado")} disabled={mudarStatus.isPending}>
                <Lock /> Converter em contrato
              </Button>
            ) : isAdmin ? (
              <Button
                variant="outline"
                onClick={() => { if (confirm("Reabrir este orçamento para edição?")) mudarStatus.mutate("orcamento"); }}
                disabled={mudarStatus.isPending}
              >
                <Unlock /> Reabrir orçamento
              </Button>
            ) : null}
          </div>
        }
      />

      {!editavel && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/15 p-3 text-sm text-warning-foreground print:hidden">
          <Lock className="mt-0.5 size-4 shrink-0" />
          <span>
            Orçamento travado (status atual: <EventoStatusBadge status={evento.status} className="align-middle" />). {isAdmin ? "Use \"Reabrir orçamento\" para editar." : "Peça para um admin reabrir o orçamento para editar."}
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface-card p-5">
            <h2 className="mb-4 text-lg font-medium">Cardápio do evento</h2>
            {itensCalculados.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum item de cardápio adicionado ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prato</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor / convidado</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    {editavel && <TableHead className="w-10 print:hidden" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensCalculados.map((i) => (
                    <TableRow key={i.vinculoId}>
                      <TableCell className="font-medium">{i.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{CATEGORIA_ITEM_CARDAPIO[i.categoria]}</TableCell>
                      <TableCell className="text-right">{formatCurrency(i.precoVendaConvidado)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(i.precoVendaConvidado * convidados)}</TableCell>
                      {editavel && (
                        <TableCell className="print:hidden">
                          <Button variant="ghost" size="icon" onClick={() => removeItem.mutate(i.vinculoId)} disabled={removeItem.isPending}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {editavel && (
              <div className="mt-4 flex gap-2 print:hidden">
                <Select value={itemParaAdicionar || "_"} onValueChange={(v) => setItemParaAdicionar(v === "_" ? "" : v)}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Escolha um item do cardápio" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">Selecione…</SelectItem>
                    {itensDisponiveis.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" disabled={!itemParaAdicionar || addItem.isPending} onClick={() => addItem.mutate()}>
                  <Plus /> Adicionar
                </Button>
              </div>
            )}
          </section>

          <section className="surface-card p-5">
            <h2 className="mb-4 text-lg font-medium">Itens avulsos</h2>
            {itensAvulsos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum item avulso (decoração, som, aluguel de espaço…) adicionado.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    {editavel && <TableHead className="w-10 print:hidden" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensAvulsos.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.descricao}</TableCell>
                      <TableCell className="text-muted-foreground">{TIPO_ITEM_AVULSO[a.tipo]}</TableCell>
                      <TableCell className="text-right">{formatCurrency(a.valor)}{a.tipo === "por_convidado" ? " /convidado" : ""}</TableCell>
                      <TableCell className="text-right">{formatCurrency(a.tipo === "por_convidado" ? a.valor * convidados : a.valor)}</TableCell>
                      {editavel && (
                        <TableCell className="print:hidden">
                          <Button variant="ghost" size="icon" onClick={() => removeAvulso.mutate(a.id)} disabled={removeAvulso.isPending}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {editavel && (
              <form onSubmit={submitAvulso} className="mt-4 flex flex-wrap gap-2 print:hidden">
                <Input
                  placeholder="Ex.: Decoração de mesa"
                  className="min-w-[160px] flex-1"
                  value={avulso.descricao}
                  onChange={(e) => setAvulso({ ...avulso, descricao: e.target.value })}
                />
                <Select value={avulso.tipo} onValueChange={(v) => setAvulso({ ...avulso, tipo: v as Enums<"tipo_item_avulso"> })}>
                  <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPO_ITEM_AVULSO) as Enums<"tipo_item_avulso">[]).map((t) => (
                      <SelectItem key={t} value={t}>{TIPO_ITEM_AVULSO[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-32"
                  placeholder="Valor"
                  value={avulso.valor}
                  onChange={(e) => setAvulso({ ...avulso, valor: Number(e.target.value) })}
                />
                <Button type="submit" disabled={addAvulso.isPending}>
                  <Plus /> Adicionar
                </Button>
              </form>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="surface-card p-5">
            <h2 className="mb-4 text-lg font-medium">Resumo do orçamento</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Convidados</dt><dd>{convidados}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Cardápio</dt><dd>{formatCurrency(subtotalCardapio)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Itens avulsos</dt><dd>{formatCurrency(subtotalAvulsos)}</dd></div>
              <div className="flex justify-between border-t pt-2 text-base font-medium"><dt>Total</dt><dd>{formatCurrency(total)}</dd></div>
              <div className="flex justify-between text-muted-foreground"><dt>Valor por convidado</dt><dd>{formatCurrency(valorPorConvidado)}</dd></div>
            </dl>
          </section>

          <section className="surface-card p-5 print:hidden">
            <h2 className="mb-1 text-sm font-medium">Margem (uso interno)</h2>
            <p className="mb-3 text-xs text-muted-foreground">Não é exibida ao cliente final — só à equipe.</p>
            <MargemBadge margem={margemCardapio} margemAlvo={empresa?.margem_alvo ?? 35} margemMinima={empresa?.margem_minima ?? 20} />
          </section>
        </div>
      </div>
    </>
  );
}
