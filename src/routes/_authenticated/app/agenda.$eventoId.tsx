import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, AlertTriangle, FileDown, Lock, Plus, Trash2, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Enums } from "@/integrations/supabase/types";
import {
  CATEGORIA_ITEM_CARDAPIO,
  STATUS_PARCELA,
  TIPO_ITEM_AVULSO,
  UNIDADE_MEDIDA,
  calcularCustoEquipe,
  calcularCustoEstrutura,
  calcularCustoItemCardapio,
  calcularValorComMargem,
  formatCurrency,
  formatDate,
  formatHora,
  parcelaAtrasada,
} from "@/lib/format";
import { PageHeader } from "@/components/app/PageHeader";
import { EventoStatusBadge, badge } from "@/components/app/StatusBadge";
import { MargemBadge } from "@/components/app/MargemBadge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [material, setMaterial] = useState({ ingrediente_id: "", quantidade_por_convidado: 1 });
  const [equipeParaAdicionar, setEquipeParaAdicionar] = useState("");
  const [estruturaParaAdicionar, setEstruturaParaAdicionar] = useState("");
  const [avulso, setAvulso] = useState<{ descricao: string; tipo: Enums<"tipo_item_avulso">; valor: number }>({
    descricao: "",
    tipo: "fixo",
    valor: 0,
  });
  const [parcela, setParcela] = useState({ descricao: "", valor: 0, data_vencimento: "" });
  const [despesa, setDespesa] = useState({ descricao: "", fornecedor: "", valor: 0, data: new Date().toISOString().slice(0, 10) });
  const [margemLucro, setMargemLucro] = useState(30);

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

  const { data: materiaisEvento = [] } = useQuery({
    queryKey: ["evento-materiais", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evento_materiais")
        .select("id, ingrediente_id, quantidade_por_convidado, ingredientes(nome, preco_unidade, unidade)")
        .eq("evento_id", eventoId);
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

  const { data: catalogoMateriais = [] } = useQuery({
    queryKey: ["materiais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ingredientes").select("id, nome, preco_unidade, unidade").eq("tipo", "material").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: equipesEvento = [] } = useQuery({
    queryKey: ["evento-equipes", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evento_equipes")
        .select("id, equipe_id, equipes(nome, equipes_funcionarios(horas, funcionarios(nome, funcao, valor_hora)))")
        .eq("evento_id", eventoId);
      if (error) throw error;
      return data;
    },
  });

  const { data: catalogoEquipes = [] } = useQuery({
    queryKey: ["equipes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipes").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: estruturasEvento = [] } = useQuery({
    queryKey: ["evento-estruturas", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evento_estruturas")
        .select("id, estrutura_id, estruturas(nome, estruturas_materiais(quantidade_por_convidado, ingredientes(nome, preco_unidade)))")
        .eq("evento_id", eventoId);
      if (error) throw error;
      return data;
    },
  });

  const { data: catalogoEstruturas = [] } = useQuery({
    queryKey: ["estruturas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("estruturas").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: parcelas = [] } = useQuery({
    queryKey: ["parcelas", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("parcelas").select("*").eq("evento_id", eventoId).order("data_vencimento");
      if (error) throw error;
      return data;
    },
  });

  const { data: despesas = [] } = useQuery({
    queryKey: ["despesas", eventoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("despesas").select("*").eq("evento_id", eventoId).order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const editavel = evento?.status === "orcamento";
  const convidados = evento?.convidados_estimados ?? 0;

  useEffect(() => {
    if (evento) setMargemLucro(evento.margem_lucro);
  }, [evento?.margem_lucro]);

  const itensCalculados = useMemo(
    () =>
      itensEvento
        .filter((ie) => ie.itens_cardapio)
        .map((ie) => {
          const item = ie.itens_cardapio!;
          const { custoConvidado } = calcularCustoItemCardapio(item.itens_cardapio_ingredientes);
          return { vinculoId: ie.id, id: item.id, nome: item.nome, categoria: item.categoria, custoConvidado };
        }),
    [itensEvento],
  );

  const custoCardapioTotal = itensCalculados.reduce((s, i) => s + i.custoConvidado, 0) * convidados;
  const custoAvulsosTotal = itensAvulsos.reduce((s, a) => s + (a.tipo === "por_convidado" ? a.valor * convidados : a.valor), 0);
  const custoMateriaisTotal = materiaisEvento.reduce((s, m) => s + m.quantidade_por_convidado * (m.ingredientes?.preco_unidade ?? 0), 0) * convidados;
  const equipesCalculadas = useMemo(
    () => equipesEvento.filter((e) => e.equipes).map((e) => ({ vinculoId: e.id, id: e.equipe_id, nome: e.equipes!.nome, custoTotal: calcularCustoEquipe(e.equipes!.equipes_funcionarios) })),
    [equipesEvento],
  );
  const custoEquipesTotal = equipesCalculadas.reduce((s, e) => s + e.custoTotal, 0);
  const estruturasCalculadas = useMemo(
    () => estruturasEvento.filter((e) => e.estruturas).map((e) => ({ vinculoId: e.id, id: e.estrutura_id, nome: e.estruturas!.nome, custoConvidado: calcularCustoEstrutura(e.estruturas!.estruturas_materiais) })),
    [estruturasEvento],
  );
  const custoEstruturasTotal = estruturasCalculadas.reduce((s, e) => s + e.custoConvidado, 0) * convidados;
  const custoTotalOrcamento = custoCardapioTotal + custoAvulsosTotal + custoMateriaisTotal + custoEquipesTotal + custoEstruturasTotal;
  const total = calcularValorComMargem(custoTotalOrcamento, margemLucro);
  const valorPorConvidado = convidados > 0 ? total / convidados : 0;

  const totalRecebido = parcelas.filter((p) => p.status === "pago").reduce((s, p) => s + p.valor, 0);
  const totalAReceber = parcelas.filter((p) => p.status === "pendente").reduce((s, p) => s + p.valor, 0);
  const parcelasAtrasadas = parcelas.filter(parcelaAtrasada);
  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0);
  const margemRealizada = total - totalDespesas;

  const itensDisponiveis = catalogo.filter((c) => !itensCalculados.some((i) => i.id === c.id));
  const materiaisDisponiveis = catalogoMateriais.filter((m) => !materiaisEvento.some((me) => me.ingrediente_id === m.id));
  const equipesDisponiveis = catalogoEquipes.filter((e) => !equipesCalculadas.some((ec) => ec.id === e.id));
  const estruturasDisponiveis = catalogoEstruturas.filter((e) => !estruturasCalculadas.some((ec) => ec.id === e.id));

  // --- Dados formatados para o PDF do orçamento (sem custos internos) ---
  const pratosPorCategoria = useMemo(() => {
    const grupos = new Map<string, string[]>();
    for (const i of itensCalculados) {
      const lista = grupos.get(i.categoria) ?? [];
      lista.push(i.nome);
      grupos.set(i.categoria, lista);
    }
    return Array.from(grupos.entries());
  }, [itensCalculados]);

  const materiaisParaImpressao = useMemo(() => {
    const nomes = new Set<string>();
    for (const m of materiaisEvento) if (m.ingredientes?.nome) nomes.add(m.ingredientes.nome);
    for (const e of estruturasEvento) for (const m of e.estruturas?.estruturas_materiais ?? []) if (m.ingredientes?.nome) nomes.add(m.ingredientes.nome);
    return Array.from(nomes);
  }, [materiaisEvento, estruturasEvento]);

  const equipeParaImpressao = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const e of equipesEvento) for (const ef of e.equipes?.equipes_funcionarios ?? []) {
      const funcao = ef.funcionarios?.funcao;
      if (!funcao) continue;
      contagem.set(funcao, (contagem.get(funcao) ?? 0) + 1);
    }
    return Array.from(contagem.entries());
  }, [equipesEvento]);

  const invalidarTudo = () => {
    void qc.invalidateQueries({ queryKey: ["evento-cardapio-itens", eventoId] });
    void qc.invalidateQueries({ queryKey: ["orcamento-itens-avulsos", eventoId] });
    void qc.invalidateQueries({ queryKey: ["evento-materiais", eventoId] });
    void qc.invalidateQueries({ queryKey: ["evento-equipes", eventoId] });
    void qc.invalidateQueries({ queryKey: ["evento-estruturas", eventoId] });
    void qc.invalidateQueries({ queryKey: ["parcelas", eventoId] });
    void qc.invalidateQueries({ queryKey: ["despesas", eventoId] });
    void qc.invalidateQueries({ queryKey: ["eventos", eventoId] });
    void qc.invalidateQueries({ queryKey: ["eventos"] });
    void qc.invalidateQueries({ queryKey: ["financeiro"] });
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

  const addMaterial = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("evento_materiais").insert({
        empresa_id: empresa!.id,
        evento_id: eventoId,
        ingrediente_id: material.ingrediente_id,
        quantidade_por_convidado: Number(material.quantidade_por_convidado) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMaterial({ ingrediente_id: "", quantidade_por_convidado: 1 });
      invalidarTudo();
    },
    onError: erroTravado,
  });

  const removeMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("evento_materiais").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidarTudo,
    onError: erroTravado,
  });

  const addEquipe = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("evento_equipes").insert({
        empresa_id: empresa!.id,
        evento_id: eventoId,
        equipe_id: equipeParaAdicionar,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setEquipeParaAdicionar("");
      invalidarTudo();
    },
    onError: erroTravado,
  });

  const removeEquipe = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("evento_equipes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidarTudo,
    onError: erroTravado,
  });

  const addEstrutura = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("evento_estruturas").insert({
        empresa_id: empresa!.id,
        evento_id: eventoId,
        estrutura_id: estruturaParaAdicionar,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setEstruturaParaAdicionar("");
      invalidarTudo();
    },
    onError: erroTravado,
  });

  const removeEstrutura = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("evento_estruturas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidarTudo,
    onError: erroTravado,
  });

  const addParcela = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("parcelas").insert({
        empresa_id: empresa!.id,
        evento_id: eventoId,
        descricao: parcela.descricao.trim(),
        valor: Number(parcela.valor) || 0,
        data_vencimento: parcela.data_vencimento,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setParcela({ descricao: "", valor: 0, data_vencimento: "" });
      invalidarTudo();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alternarPagamento = useMutation({
    mutationFn: async (p: { id: string; pago: boolean }) => {
      const { error } = await supabase
        .from("parcelas")
        .update(p.pago ? { status: "pago", data_pagamento: new Date().toISOString().slice(0, 10) } : { status: "pendente", data_pagamento: null })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: invalidarTudo,
    onError: (e: Error) => toast.error(e.message),
  });

  const removeParcela = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("parcelas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidarTudo,
    onError: (e: Error) => toast.error(e.message),
  });

  const addDespesa = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("despesas").insert({
        empresa_id: empresa!.id,
        evento_id: eventoId,
        descricao: despesa.descricao.trim(),
        fornecedor: despesa.fornecedor.trim() || null,
        valor: Number(despesa.valor) || 0,
        data: despesa.data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDespesa({ descricao: "", fornecedor: "", valor: 0, data: new Date().toISOString().slice(0, 10) });
      invalidarTudo();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeDespesa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("despesas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidarTudo,
    onError: (e: Error) => toast.error(e.message),
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

  const salvarMargem = useMutation({
    mutationFn: async (valor: number) => {
      const { error } = await supabase.from("eventos").update({ margem_lucro: valor }).eq("id", eventoId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidarTudo();
      toast.success("Margem de lucro atualizada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitAvulso = (e: FormEvent) => {
    e.preventDefault();
    if (!avulso.descricao.trim()) { toast.error("Descreva o item avulso."); return; }
    addAvulso.mutate();
  };

  const submitParcela = (e: FormEvent) => {
    e.preventDefault();
    if (!parcela.data_vencimento) { toast.error("Informe a data de vencimento."); return; }
    if (!parcela.valor || parcela.valor <= 0) { toast.error("Informe o valor da parcela."); return; }
    addParcela.mutate();
  };

  const submitDespesa = (e: FormEvent) => {
    e.preventDefault();
    if (!despesa.descricao.trim()) { toast.error("Descreva a despesa."); return; }
    addDespesa.mutate();
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

      <div className="print:hidden">
        <PageHeader
          title={evento.titulo}
          description={`${formatDate(evento.data, "EEEE, d 'de' MMMM")} · ${formatHora(evento.hora_inicio)}–${formatHora(evento.hora_fim)}${evento.local ? ` · ${evento.local}` : ""}${evento.clientes?.nome ? ` · ${evento.clientes.nome}` : ""}`}
          actions={
            <div className="flex flex-wrap items-center gap-2 print:hidden">
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
      </div>

      {!editavel && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/15 p-3 text-sm text-warning-foreground print:hidden">
          <Lock className="mt-0.5 size-4 shrink-0" />
          <span>
            Orçamento travado (status atual: <EventoStatusBadge status={evento.status} className="align-middle" />). {isAdmin ? "Use \"Reabrir orçamento\" para editar." : "Peça para um admin reabrir o orçamento para editar."}
          </span>
        </div>
      )}

      {/* Documento de orçamento para o cliente — só aparece ao gerar PDF/imprimir.
          Propositalmente não mostra nenhum custo interno (ficha técnica, margem,
          financeiro): só o que está incluso e o valor final por convidado. */}
      <div className="hidden print:block">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold uppercase tracking-wide">{empresa?.nome}</h1>
          <p className="mt-1 text-base font-semibold uppercase text-muted-foreground">Orçamento — {evento.titulo}</p>
        </div>

        <table className="mb-6 text-sm">
          <tbody>
            <tr><td className="pr-3 font-semibold">Cliente</td><td>{evento.clientes?.nome ?? "—"}</td></tr>
            <tr><td className="pr-3 font-semibold">Data</td><td>{formatDate(evento.data, "dd/MM/yyyy")}</td></tr>
            <tr><td className="pr-3 font-semibold">Local</td><td>{evento.local || "—"}</td></tr>
            <tr><td className="pr-3 font-semibold">Convidados</td><td>{convidados} pessoas</td></tr>
          </tbody>
        </table>

        {pratosPorCategoria.length > 0 && (
          <div className="mb-5">
            <h2 className="mb-2 text-sm font-bold uppercase">Cardápio</h2>
            {pratosPorCategoria.map(([categoria, nomes]) => (
              <div key={categoria} className="mb-2">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{CATEGORIA_ITEM_CARDAPIO[categoria as Enums<"categoria_item_cardapio">]}</p>
                <ul className="text-sm">
                  {nomes.map((nome) => <li key={nome}>• {nome}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {materiaisParaImpressao.length > 0 && (
          <div className="mb-5">
            <h2 className="mb-2 text-sm font-bold uppercase">Estrutura e materiais inclusos</h2>
            <ul className="text-sm">
              {materiaisParaImpressao.map((nome) => <li key={nome}>• {nome}</li>)}
            </ul>
          </div>
        )}

        {equipeParaImpressao.length > 0 && (
          <div className="mb-5">
            <h2 className="mb-2 text-sm font-bold uppercase">Equipe</h2>
            <ul className="text-sm">
              {equipeParaImpressao.map(([funcao, qtd]) => <li key={funcao}>• {qtd} {funcao}</li>)}
            </ul>
          </div>
        )}

        <div className="mb-6 border-t pt-4">
          <h2 className="mb-2 text-sm font-bold uppercase">Investimento</h2>
          <p className="text-base">Valor por convidado: <span className="font-bold">{formatCurrency(valorPorConvidado)}</span></p>
        </div>

        <div className="border-t pt-4 text-center text-xs text-muted-foreground">
          <p className="font-semibold">{empresa?.nome}</p>
          {empresa?.endereco && <p>{empresa.endereco}</p>}
          {empresa?.telefone && <p>{empresa.telefone}</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 print:hidden">
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
                    <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                    <TableHead className="text-right">Custo / convidado</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    {editavel && <TableHead className="w-10 print:hidden" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensCalculados.map((i) => (
                    <TableRow key={i.vinculoId}>
                      <TableCell className="font-medium">{i.nome}</TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">{CATEGORIA_ITEM_CARDAPIO[i.categoria]}</TableCell>
                      <TableCell className="text-right">{formatCurrency(i.custoConvidado)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(i.custoConvidado * convidados)}</TableCell>
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

            {editavel && catalogo.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground print:hidden">
                Você ainda não tem pratos cadastrados.{" "}
                <Link to="/app/cardapio" className="text-primary hover:underline">Cadastrar cardápio</Link> para poder montar o orçamento.
              </p>
            )}

            {editavel && catalogo.length > 0 && (
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
            <h2 className="mb-4 text-lg font-medium">Materiais do evento</h2>
            {materiaisEvento.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum material (mesa, cadeira, descartáveis…) adicionado ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Qtd. / convidado</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    {editavel && <TableHead className="w-10 print:hidden" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materiaisEvento.map((m) => {
                    const preco = m.ingredientes?.preco_unidade ?? 0;
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.ingredientes?.nome ?? "—"}</TableCell>
                        <TableCell className="text-right">{m.quantidade_por_convidado} {m.ingredientes ? UNIDADE_MEDIDA[m.ingredientes.unidade] : ""}</TableCell>
                        <TableCell className="text-right">{formatCurrency(m.quantidade_por_convidado * preco * convidados)}</TableCell>
                        {editavel && (
                          <TableCell className="print:hidden">
                            <Button variant="ghost" size="icon" onClick={() => removeMaterial.mutate(m.id)} disabled={removeMaterial.isPending}>
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {editavel && catalogoMateriais.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground print:hidden">
                Você ainda não tem materiais cadastrados.{" "}
                <Link to="/app/ingredientes" className="text-primary hover:underline">Cadastrar material</Link> para poder adicionar aqui.
              </p>
            )}

            {editavel && catalogoMateriais.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 print:hidden">
                <Select value={material.ingrediente_id || "_"} onValueChange={(v) => setMaterial({ ...material, ingrediente_id: v === "_" ? "" : v })}>
                  <SelectTrigger className="min-w-[160px] flex-1"><SelectValue placeholder="Escolha um material" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">Selecione…</SelectItem>
                    {materiaisDisponiveis.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-32"
                  placeholder="Qtd. / convidado"
                  value={material.quantidade_por_convidado}
                  onChange={(e) => setMaterial({ ...material, quantidade_por_convidado: Number(e.target.value) })}
                />
                <Button type="button" disabled={!material.ingrediente_id || addMaterial.isPending} onClick={() => addMaterial.mutate()}>
                  <Plus /> Adicionar
                </Button>
              </div>
            )}
          </section>

          <section className="surface-card p-5">
            <h2 className="mb-4 text-lg font-medium">Equipe do evento</h2>
            {equipesCalculadas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma equipe adicionada ainda.</p>
            ) : (
              <ul className="divide-y">
                {equipesCalculadas.map((e) => (
                  <li key={e.vinculoId} className="flex items-center gap-3 py-2.5">
                    <span className="flex-1 text-sm font-medium">{e.nome}</span>
                    <span className="text-sm text-muted-foreground">{formatCurrency(e.custoTotal)}</span>
                    {editavel && (
                      <Button variant="ghost" size="icon" onClick={() => removeEquipe.mutate(e.vinculoId)} disabled={removeEquipe.isPending}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {editavel && catalogoEquipes.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground print:hidden">
                Você ainda não tem equipes cadastradas.{" "}
                <Link to="/app/cardapio" className="text-primary hover:underline">Cadastrar equipe</Link> para poder adicionar aqui.
              </p>
            )}

            {editavel && catalogoEquipes.length > 0 && (
              <div className="mt-4 flex gap-2 print:hidden">
                <Select value={equipeParaAdicionar || "_"} onValueChange={(v) => setEquipeParaAdicionar(v === "_" ? "" : v)}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Escolha uma equipe" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">Selecione…</SelectItem>
                    {equipesDisponiveis.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" disabled={!equipeParaAdicionar || addEquipe.isPending} onClick={() => addEquipe.mutate()}>
                  <Plus /> Adicionar
                </Button>
              </div>
            )}
          </section>

          <section className="surface-card p-5">
            <h2 className="mb-4 text-lg font-medium">Estrutura do evento</h2>
            {estruturasCalculadas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma estrutura adicionada ainda.</p>
            ) : (
              <ul className="divide-y">
                {estruturasCalculadas.map((e) => (
                  <li key={e.vinculoId} className="flex items-center gap-3 py-2.5">
                    <span className="flex-1 text-sm font-medium">{e.nome}</span>
                    <span className="text-sm text-muted-foreground">{formatCurrency(e.custoConvidado * convidados)}</span>
                    {editavel && (
                      <Button variant="ghost" size="icon" onClick={() => removeEstrutura.mutate(e.vinculoId)} disabled={removeEstrutura.isPending}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {editavel && catalogoEstruturas.length === 0 && (
              <p className="mt-4 text-sm text-muted-foreground print:hidden">
                Você ainda não tem estruturas cadastradas.{" "}
                <Link to="/app/cardapio" className="text-primary hover:underline">Cadastrar estrutura</Link> para poder adicionar aqui.
              </p>
            )}

            {editavel && catalogoEstruturas.length > 0 && (
              <div className="mt-4 flex gap-2 print:hidden">
                <Select value={estruturaParaAdicionar || "_"} onValueChange={(v) => setEstruturaParaAdicionar(v === "_" ? "" : v)}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Escolha uma estrutura" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_">Selecione…</SelectItem>
                    {estruturasDisponiveis.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" disabled={!estruturaParaAdicionar || addEstrutura.isPending} onClick={() => addEstrutura.mutate()}>
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
                    <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    {editavel && <TableHead className="w-10 print:hidden" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itensAvulsos.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.descricao}</TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">{TIPO_ITEM_AVULSO[a.tipo]}</TableCell>
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

          <section className="surface-card p-5">
            <h2 className="mb-4 text-lg font-medium">Parcelas a receber</h2>
            {parcelas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma parcela lançada ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden sm:table-cell">Descrição</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10 print:hidden" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcelas.map((p) => {
                    const atrasada = parcelaAtrasada(p);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="hidden font-medium sm:table-cell">{p.descricao || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(p.data_vencimento)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.valor)}</TableCell>
                        <TableCell>
                          <span className={cn(badge({ tone: p.status === "pago" ? "success" : atrasada ? "destructive" : "warning" }))}>
                            <span className="size-1.5 rounded-full bg-current" />
                            {p.status === "pago" ? STATUS_PARCELA.pago : atrasada ? "Atrasada" : STATUS_PARCELA.pendente}
                          </span>
                        </TableCell>
                        <TableCell className="flex items-center gap-1 print:hidden">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => alternarPagamento.mutate({ id: p.id, pago: p.status !== "pago" })}
                            disabled={alternarPagamento.isPending}
                          >
                            {p.status === "pago" ? "Marcar pendente" : "Marcar pago"}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => removeParcela.mutate(p.id)} disabled={removeParcela.isPending}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            <form onSubmit={submitParcela} className="mt-4 flex flex-wrap gap-2 print:hidden">
              <Input
                placeholder="Ex.: Entrada, 2ª parcela…"
                className="min-w-[160px] flex-1"
                value={parcela.descricao}
                onChange={(e) => setParcela({ ...parcela, descricao: e.target.value })}
              />
              <Input
                type="date"
                className="w-40"
                value={parcela.data_vencimento}
                onChange={(e) => setParcela({ ...parcela, data_vencimento: e.target.value })}
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                className="w-32"
                placeholder="Valor"
                value={parcela.valor}
                onChange={(e) => setParcela({ ...parcela, valor: Number(e.target.value) })}
              />
              <Button type="submit" disabled={addParcela.isPending}>
                <Plus /> Adicionar
              </Button>
            </form>
          </section>

          <section className="surface-card p-5">
            <h2 className="mb-4 text-lg font-medium">Despesas</h2>
            {despesas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma despesa lançada ainda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="hidden sm:table-cell">Fornecedor</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-10 print:hidden" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {despesas.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.descricao}</TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">{d.fornecedor || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(d.data)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(d.valor)}</TableCell>
                      <TableCell className="print:hidden">
                        <Button variant="ghost" size="icon" onClick={() => removeDespesa.mutate(d.id)} disabled={removeDespesa.isPending}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <form onSubmit={submitDespesa} className="mt-4 flex flex-wrap gap-2 print:hidden">
              <Input
                placeholder="Ex.: Aluguel de louças"
                className="min-w-[160px] flex-1"
                value={despesa.descricao}
                onChange={(e) => setDespesa({ ...despesa, descricao: e.target.value })}
              />
              <Input
                placeholder="Fornecedor (opcional)"
                className="w-44"
                value={despesa.fornecedor}
                onChange={(e) => setDespesa({ ...despesa, fornecedor: e.target.value })}
              />
              <Input
                type="date"
                className="w-40"
                value={despesa.data}
                onChange={(e) => setDespesa({ ...despesa, data: e.target.value })}
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                className="w-32"
                placeholder="Valor"
                value={despesa.valor}
                onChange={(e) => setDespesa({ ...despesa, valor: Number(e.target.value) })}
              />
              <Button type="submit" disabled={addDespesa.isPending}>
                <Plus /> Adicionar
              </Button>
            </form>
          </section>
        </div>

        <div className="space-y-6">
          <section className="surface-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">Resumo do orçamento</h2>
              <MargemBadge margem={margemLucro} />
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Convidados</dt><dd>{convidados}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Custo do cardápio</dt><dd>{formatCurrency(custoCardapioTotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Custo de materiais</dt><dd>{formatCurrency(custoMateriaisTotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Custo de equipe</dt><dd>{formatCurrency(custoEquipesTotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Custo de estrutura</dt><dd>{formatCurrency(custoEstruturasTotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Custo de itens avulsos</dt><dd>{formatCurrency(custoAvulsosTotal)}</dd></div>
              <div className="flex justify-between border-t pt-2"><dt className="text-muted-foreground">Custo total do orçamento</dt><dd>{formatCurrency(custoTotalOrcamento)}</dd></div>
            </dl>

            <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4 print:hidden">
              <Label htmlFor="margem-lucro" className="text-sm text-muted-foreground">Margem de lucro desejada (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="margem-lucro"
                  type="number"
                  min={0}
                  step="1"
                  className="w-20 text-right"
                  value={margemLucro}
                  disabled={!editavel}
                  onChange={(e) => setMargemLucro(Number(e.target.value))}
                />
                {editavel && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={salvarMargem.isPending || margemLucro === evento.margem_lucro}
                    onClick={() => salvarMargem.mutate(margemLucro)}
                  >
                    Salvar
                  </Button>
                )}
              </div>
            </div>

            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between border-t pt-2 text-base font-medium"><dt>Total do orçamento</dt><dd>{formatCurrency(total)}</dd></div>
              <div className="flex justify-between text-muted-foreground"><dt>Valor por convidado</dt><dd>{formatCurrency(valorPorConvidado)}</dd></div>
            </dl>
          </section>

          <section className="surface-card p-5 print:hidden">
            <h2 className="mb-4 text-lg font-medium">Financeiro</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Recebido</dt><dd className="text-success">{formatCurrency(totalRecebido)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">A receber</dt><dd>{formatCurrency(totalAReceber)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Despesas</dt><dd className="text-destructive">{formatCurrency(totalDespesas)}</dd></div>
              <div className="flex justify-between border-t pt-2 text-base font-medium"><dt>Margem realizada</dt><dd>{formatCurrency(margemRealizada)}</dd></div>
            </dl>
            {parcelasAtrasadas.length > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>{parcelasAtrasadas.length} parcela{parcelasAtrasadas.length > 1 ? "s" : ""} atrasada{parcelasAtrasadas.length > 1 ? "s" : ""}.</span>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
