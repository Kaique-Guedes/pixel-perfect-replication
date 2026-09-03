import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Enums, Tables } from "@/integrations/supabase/types";
import { CLIENTE_STATUS, ORIGENS_LEAD } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Cliente = Tables<"clientes">;

const empty = { nome: "", telefone: "", email: "", origem: "", status: "novo_lead" as Enums<"cliente_status">, observacoes: "" };

export function ClienteDialog({
  open,
  onOpenChange,
  cliente,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cliente?: Cliente | null;
  onSaved?: (c: Cliente) => void;
}) {
  const { empresa } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (open) {
      setForm(
        cliente
          ? {
              nome: cliente.nome,
              telefone: cliente.telefone ?? "",
              email: cliente.email ?? "",
              origem: cliente.origem ?? "",
              status: cliente.status,
              observacoes: cliente.observacoes ?? "",
            }
          : empty,
      );
    }
  }, [open, cliente]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        empresa_id: empresa!.id,
        nome: form.nome.trim(),
        telefone: form.telefone.trim() || null,
        email: form.email.trim() || null,
        origem: form.origem || null,
        status: form.status,
        observacoes: form.observacoes.trim() || null,
      };
      const q = cliente
        ? supabase.from("clientes").update(payload).eq("id", cliente.id).select().single()
        : supabase.from("clientes").insert(payload).select().single();
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success(cliente ? "Cliente atualizado." : "Cliente cadastrado.");
      onOpenChange(false);
      onSaved?.(data);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe o nome do cliente.");
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{cliente ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            <DialogDescription>Dados de contato e etapa no funil.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="c-nome">Nome</Label>
            <Input id="c-nome" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-tel">Telefone / WhatsApp</Label>
              <Input id="c-tel" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-email">E-mail</Label>
              <Input id="c-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Origem do lead</Label>
              <Select value={form.origem || "_"} onValueChange={(v) => setForm({ ...form, origem: v === "_" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">Não informado</SelectItem>
                  {ORIGENS_LEAD.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Enums<"cliente_status"> })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CLIENTE_STATUS) as Enums<"cliente_status">[]).map((s) => (
                    <SelectItem key={s} value={s}>{CLIENTE_STATUS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-obs">Observações</Label>
            <Textarea id="c-obs" rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
