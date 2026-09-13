import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, Receipt, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Enums, Tables } from "@/integrations/supabase/types";
import { EVENTO_STATUS, STATUS_BLOQUEIA_AGENDA, CATEGORIA_ITEM_CARDAPIO, calcularCustoItemCardapio, calcularValorComMargem, formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export type Evento = Tables<"eventos">;

const empty = {
  titulo: "",
  cliente_id: "",
  data: "",
  hora_inicio: "18:00",
  hora_fim: "23:00",
  local: "",
  convidados_estimados: 0,
  status: "orcamento" as Enums<"evento_status">,
  observacoes: "",
  margem_lucro: 30,
};

export function EventoDialog({
  open,
  onOpenChange,
  evento,
  defaults,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  evento?: Evento | null;
  defaults?: Partial<typeof empty>;
}) {
  const { empresa } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [selecionados, setSelecionados] = useState<string[]>([]);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes", "options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: catalogo = [] } = useQuery({
    queryKey: ["itens-cardapio", "orcamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_cardapio")
        .select("id, nome, categoria, itens_cardapio_ingredientes(quantidade_por_convidado, ingredientes(preco_unidade))")
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: itensDoEvento } = useQuery({
    queryKey: ["evento-cardapio-itens", evento?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evento_cardapio_itens")
        .select("id, item_cardapio_id")
        .eq("evento_id", evento!.id);
      if (error) throw error;
      return data;
    },
    enabled: open && !!evento?.id,
  });


  useEffect(() => {
    if (!open) return;
    setForm(
      evento
        ? {
            titulo: evento.titulo,
            cliente_id: evento.cliente_id ?? "",
            data: evento.data,
            hora_inicio: evento.hora_inicio.slice(0, 5),
            hora_fim: evento.hora_fim.slice(0, 5),
            local: evento.local ?? "",
            convidados_estimados: evento.convidados_estimados,
            status: evento.status,
            observacoes: evento.observacoes ?? "",
            margem_lucro: evento.margem_lucro,
          }
        : { ...empty, ...defaults },
    );
  }, [open, evento, defaults]);

  useEffect(() => {
    if (!open) return;
    if (!evento) { setSelecionados([]); return; }
    if (itensDoEvento) setSelecionados(itensDoEvento.map((i) => i.item_cardapio_id));
  }, [open, evento, itensDoEvento]);


  // Aviso preventivo de conflito (a regra definitiva é aplicada no banco)
  const { data: conflito } = useQuery({
    queryKey: ["eventos", "conflito", form.data, form.hora_inicio, form.hora_fim, form.local, evento?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("eventos")
        .select("id, titulo, local, status")
        .eq("data", form.data)
        .in("status", STATUS_BLOQUEIA_AGENDA)
        .lt("hora_inicio", form.hora_fim)
        .gt("hora_fim", form.hora_inicio);
      return (data ?? []).find(
        (e) => e.id !== evento?.id && (e.local ?? "").trim().toLowerCase() === form.local.trim().toLowerCase(),
      ) ?? null;
    },
    enabled: open && !!form.data && !!form.hora_inicio && !!form.hora_fim,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        empresa_id: empresa!.id,
        titulo: form.titulo.trim(),
        cliente_id: form.cliente_id || null,
        data: form.data,
        hora_inicio: form.hora_inicio,
        hora_fim: form.hora_fim,
        local: form.local.trim() || null,
        convidados_estimados: Number(form.convidados_estimados) || 0,
        status: form.status,
        observacoes: form.observacoes.trim() || null,
        margem_lucro: Number(form.margem_lucro) || 0,
      };
      let eventoId: string;
      if (evento) {
        const { error } = await supabase.from("eventos").update(payload).eq("id", evento.id);
        if (error) throw error;
        eventoId = evento.id;
      } else {
        const { data, error } = await supabase.from("eventos").insert(payload).select("id").single();
        if (error) throw error;
        eventoId = data.id;
      }

      // Sincroniza o cardápio do orçamento
      const atuais = itensDoEvento ?? [];
      const remover = atuais.filter((a) => !selecionados.includes(a.item_cardapio_id)).map((a) => a.id);
      const adicionar = selecionados.filter((id) => !atuais.some((a) => a.item_cardapio_id === id));
      if (remover.length) {
        const { error } = await supabase.from("evento_cardapio_itens").delete().in("id", remover);
        if (error) throw error;
      }
      if (adicionar.length) {
        const { error } = await supabase.from("evento_cardapio_itens").insert(
          adicionar.map((item_cardapio_id) => ({ empresa_id: empresa!.id, evento_id: eventoId, item_cardapio_id })),
        );
        if (error) throw error;
      }
      return eventoId;
    },
    onSuccess: (id) => {
      void qc.invalidateQueries({ queryKey: ["eventos"] });
      void qc.invalidateQueries({ queryKey: ["evento-cardapio-itens"] });
      onOpenChange(false);
      toast.success(evento ? "Evento e orçamento atualizados." : "Evento criado com o orçamento do cardápio.");
      void navigate({ to: "/app/agenda/$eventoId", params: { eventoId: id } });
    },
    onError: (e: Error) => {
      if (e.message.includes("OVERBOOKING")) {
        toast.error("Conflito de agenda", { description: e.message.replace("OVERBOOKING: ", "") });
      } else if (e.message.includes("ORCAMENTO_TRAVADO")) {
        toast.error("Orçamento travado", { description: "Este orçamento já virou contrato e não pode ter o cardápio alterado." });
      } else toast.error(e.message);
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("eventos").delete().eq("id", evento!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["eventos"] });
      toast.success("Evento excluído.");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const convidados = Number(form.convidados_estimados) || 0;

  const catalogoCalculado = useMemo(
    () =>
      catalogo.map((c) => ({
        ...c,
        custoConvidado: calcularCustoItemCardapio(c.itens_cardapio_ingredientes).custoConvidado,
      })),
    [catalogo],
  );

  const custoCardapioTotal =
    catalogoCalculado.filter((c) => selecionados.includes(c.id)).reduce((s, c) => s + c.custoConvidado, 0) * convidados;
  const totalOrcamento = calcularValorComMargem(custoCardapioTotal, Number(form.margem_lucro) || 0);

  const toggleItem = (id: string) =>
    setSelecionados((atual) => (atual.includes(id) ? atual.filter((i) => i !== id) : [...atual, id]));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.data) { toast.error("Informe título e data."); return; }
    if (form.hora_fim <= form.hora_inicio) { toast.error("O horário de término deve ser após o início."); return; }
    save.mutate();
  };

  const bloqueia = STATUS_BLOQUEIA_AGENDA.includes(form.status);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{evento ? "Editar evento" : "Novo evento"}</DialogTitle>
            <DialogDescription>Eventos confirmados ou com contrato assinado bloqueiam a agenda.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="e-titulo">Título</Label>
            <Input id="e-titulo" required placeholder="Ex.: Casamento Ana & João" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={form.cliente_id || "_"} onValueChange={(v) => setForm({ ...form, cliente_id: v === "_" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">Sem cliente</SelectItem>
                  {clientes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Enums<"evento_status"> })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(EVENTO_STATUS) as Enums<"evento_status">[]).map((s) => (
                    <SelectItem key={s} value={s}>{EVENTO_STATUS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="e-data">Data</Label>
              <Input id="e-data" type="date" required value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-ini">Início</Label>
              <Input id="e-ini" type="time" required value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-fim">Término</Label>
              <Input id="e-fim" type="time" required value={form.hora_fim} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <div className="space-y-2">
              <Label htmlFor="e-local">Local / Salão</Label>
              <Input id="e-local" placeholder="Ex.: Salão Principal" value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-conv">Convidados</Label>
              <Input id="e-conv" type="number" min={0} value={form.convidados_estimados} onChange={(e) => setForm({ ...form, convidados_estimados: Number(e.target.value) })} />
            </div>
          </div>

          {conflito && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/15 p-3 text-sm text-warning-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>
                Já existe <strong>{conflito.titulo}</strong> ({EVENTO_STATUS[conflito.status]}) neste local e horário.
                {bloqueia ? " Não será possível salvar com este status." : " Você pode salvar como orçamento, mas não confirmar."}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="e-obs">Observações</Label>
            <Textarea id="e-obs" rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Cardápio do orçamento</Label>
            {catalogoCalculado.length === 0 ? (
              <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                Nenhum item de cardápio cadastrado ainda. Cadastre em "Cardápio" para poder montar o orçamento aqui — ou salve o evento e monte depois na tela dele.
              </p>
            ) : (
              <div className="max-h-52 space-y-1 overflow-y-auto rounded-lg border p-2">
                {catalogoCalculado.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 hover:bg-accent/50">
                    <Checkbox checked={selecionados.includes(c.id)} onCheckedChange={() => toggleItem(c.id)} />
                    <span className="flex-1 text-sm">{c.nome}</span>
                    <span className="text-xs text-muted-foreground">{CATEGORIA_ITEM_CARDAPIO[c.categoria]}</span>
                    <span className="text-sm text-muted-foreground">{formatCurrency(c.custoConvidado)}/convidado (custo)</span>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Materiais (mesa, cadeira etc.) e itens avulsos (decoração, som etc.) são ajustados na tela do evento depois de salvar — a margem abaixo se aplica sobre eles também.</p>
          </div>

          {selecionados.length > 0 && (
            <div className="space-y-2 rounded-lg bg-accent/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="e-margem" className="text-sm">Margem de lucro desejada (%)</Label>
                <Input
                  id="e-margem"
                  type="number"
                  min={0}
                  step="1"
                  className="w-24 text-right"
                  value={form.margem_lucro}
                  onChange={(e) => setForm({ ...form, margem_lucro: Number(e.target.value) })}
                />
              </div>
              <p className="text-right text-sm text-muted-foreground">
                Custo do cardápio ({convidados} convidado{convidados === 1 ? "" : "s"}): {formatCurrency(custoCardapioTotal)}
              </p>
              <p className="text-right text-sm">
                Total do orçamento (com margem): <span className="font-medium text-foreground">{formatCurrency(totalOrcamento)}</span>
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            {evento ? (
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={remove.isPending} onClick={() => { if (confirm("Excluir este evento?")) remove.mutate(); }}>
                <Trash2 /> Excluir
              </Button>
            ) : <span />}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              {evento && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { onOpenChange(false); void navigate({ to: "/app/agenda/$eventoId", params: { eventoId: evento.id } }); }}
                >
                  <Receipt /> Montar orçamento
                </Button>
              )}
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
