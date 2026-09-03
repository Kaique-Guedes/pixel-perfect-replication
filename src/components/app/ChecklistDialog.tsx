import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Checklist = Tables<"checklists">;
type ItemLinha = { key: string; titulo: string; dias_antes: number };

let seq = 0;
const novaLinha = (): ItemLinha => ({ key: `novo-${++seq}`, titulo: "", dias_antes: 7 });

export function ChecklistDialog({
  open,
  onOpenChange,
  checklist,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  checklist?: Checklist | null;
}) {
  const { empresa } = useAuth();
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [linhas, setLinhas] = useState<ItemLinha[]>([novaLinha()]);

  const { data: itensAtuais } = useQuery({
    queryKey: ["checklist-template-itens", checklist?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_template_itens")
        .select("titulo, dias_antes")
        .eq("checklist_id", checklist!.id)
        .order("ordem");
      if (error) throw error;
      return data;
    },
    enabled: open && !!checklist,
  });

  useEffect(() => {
    if (!open) return;
    if (checklist) {
      setNome(checklist.nome);
      setLinhas(
        itensAtuais && itensAtuais.length > 0
          ? itensAtuais.map((i) => ({ key: `${i.titulo}-${Math.random()}`, titulo: i.titulo, dias_antes: i.dias_antes }))
          : [novaLinha()],
      );
    } else {
      setNome("");
      setLinhas([novaLinha()]);
    }
  }, [open, checklist, itensAtuais]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { empresa_id: empresa!.id, nome: nome.trim() };
      const { data: salvo, error } = checklist
        ? await supabase.from("checklists").update(payload).eq("id", checklist.id).select().single()
        : await supabase.from("checklists").insert(payload).select().single();
      if (error) throw error;

      const checklistId = salvo.id;
      const { error: delError } = await supabase.from("checklist_template_itens").delete().eq("checklist_id", checklistId);
      if (delError) throw delError;

      const validas = linhas.filter((l) => l.titulo.trim());
      if (validas.length > 0) {
        const { error: insError } = await supabase.from("checklist_template_itens").insert(
          validas.map((l, idx) => ({
            empresa_id: empresa!.id,
            checklist_id: checklistId,
            titulo: l.titulo.trim(),
            dias_antes: Number(l.dias_antes) || 0,
            ordem: idx,
          })),
        );
        if (insError) throw insError;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["checklists"] });
      void qc.invalidateQueries({ queryKey: ["checklist-template-itens"] });
      toast.success(checklist ? "Checklist atualizado." : "Checklist criado.");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("checklists").delete().eq("id", checklist!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["checklists"] });
      toast.success("Checklist excluído.");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return toast.error("Dê um nome ao checklist.");
    if (!linhas.some((l) => l.titulo.trim())) return toast.error("Adicione ao menos uma tarefa.");
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{checklist ? "Editar checklist" : "Novo checklist"}</DialogTitle>
            <DialogDescription>Ex.: "Checklist padrão casamento". "Dias antes" é relativo à data do evento.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="cl-nome">Nome do checklist</Label>
            <Input id="cl-nome" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Checklist padrão casamento" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Tarefas</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setLinhas([...linhas, novaLinha()])}>
                <Plus /> Tarefa
              </Button>
            </div>
            <div className="space-y-2 rounded-lg border p-3">
              {linhas.map((linha, idx) => (
                <div key={linha.key} className="flex items-center gap-2">
                  <Input
                    placeholder="Ex.: Confirmar cardápio final"
                    className="flex-1"
                    value={linha.titulo}
                    onChange={(e) => {
                      const next = [...linhas];
                      next[idx] = { ...linha, titulo: e.target.value };
                      setLinhas(next);
                    }}
                  />
                  <Input
                    type="number"
                    min={0}
                    className="w-20"
                    value={linha.dias_antes}
                    onChange={(e) => {
                      const next = [...linhas];
                      next[idx] = { ...linha, dias_antes: Number(e.target.value) };
                      setLinhas(next);
                    }}
                  />
                  <span className="w-20 shrink-0 text-xs text-muted-foreground">dias antes</span>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setLinhas(linhas.filter((l) => l.key !== linha.key))}>
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {checklist ? (
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={remove.isPending} onClick={() => { if (confirm("Excluir este checklist?")) remove.mutate(); }}>
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
