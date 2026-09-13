import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Funcionario = Tables<"funcionarios">;

const empty = { nome: "", funcao: "", valor_hora: 0 };

export function FuncionarioDialog({
  open,
  onOpenChange,
  funcionario,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  funcionario?: Funcionario | null;
}) {
  const { empresa } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!open) return;
    setForm(
      funcionario
        ? { nome: funcionario.nome, funcao: funcionario.funcao, valor_hora: funcionario.valor_hora }
        : empty,
    );
  }, [open, funcionario]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        empresa_id: empresa!.id,
        nome: form.nome.trim(),
        funcao: form.funcao.trim(),
        valor_hora: Number(form.valor_hora) || 0,
      };
      const q = funcionario
        ? supabase.from("funcionarios").update(payload).eq("id", funcionario.id)
        : supabase.from("funcionarios").insert(payload);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["funcionarios"] });
      toast.success(funcionario ? "Funcionário atualizado." : "Funcionário cadastrado.");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("funcionarios").delete().eq("id", funcionario!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["funcionarios"] });
      toast.success("Funcionário excluído.");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error("Informe o nome."); return; }
    if (!form.funcao.trim()) { toast.error("Informe a função (ex.: cozinheiro, garçom)."); return; }
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{funcionario ? "Editar funcionário" : "Novo funcionário"}</DialogTitle>
            <DialogDescription>Cadastro da equipe, com valor por hora trabalhada.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="f-nome">Nome</Label>
            <Input id="f-nome" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Maria Silva" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="f-funcao">Função</Label>
              <Input id="f-funcao" required value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} placeholder="Ex.: Cozinheiro, garçom…" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-valor">Valor por hora (R$)</Label>
              <Input id="f-valor" type="number" min={0} step="0.01" value={form.valor_hora} onChange={(e) => setForm({ ...form, valor_hora: Number(e.target.value) })} />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {funcionario ? (
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={remove.isPending} onClick={() => { if (confirm("Excluir este funcionário?")) remove.mutate(); }}>
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
