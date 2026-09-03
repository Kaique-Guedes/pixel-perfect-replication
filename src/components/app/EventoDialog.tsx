import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Enums, Tables } from "@/integrations/supabase/types";
import { EVENTO_STATUS, STATUS_BLOQUEIA_AGENDA } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [form, setForm] = useState(empty);

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes", "options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
    enabled: open,
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
          }
        : { ...empty, ...defaults },
    );
  }, [open, evento, defaults]);

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
      };
      const { error } = evento
        ? await supabase.from("eventos").update(payload).eq("id", evento.id)
        : await supabase.from("eventos").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["eventos"] });
      toast.success(evento ? "Evento atualizado." : "Evento criado.");
      onOpenChange(false);
    },
    onError: (e: Error) => {
      if (e.message.includes("OVERBOOKING")) {
        toast.error("Conflito de agenda", { description: e.message.replace("OVERBOOKING: ", "") });
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

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.data) return toast.error("Informe título e data.");
    if (form.hora_fim <= form.hora_inicio) return toast.error("O horário de término deve ser após o início.");
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

          <DialogFooter className="gap-2 sm:justify-between">
            {evento ? (
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={remove.isPending} onClick={() => { if (confirm("Excluir este evento?")) remove.mutate(); }}>
                <Trash2 /> Excluir
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
