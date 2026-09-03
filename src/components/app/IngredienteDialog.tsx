import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Enums, Tables } from "@/integrations/supabase/types";
import { CATEGORIA_INGREDIENTE, UNIDADE_MEDIDA } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Ingrediente = Tables<"ingredientes">;

const empty = {
  nome: "",
  unidade: "unidade" as Enums<"unidade_medida">,
  preco_unidade: 0,
  categoria: "outro" as Enums<"categoria_ingrediente">,
  fornecedor: "",
  estoque_atual: 0,
};

export function IngredienteDialog({
  open,
  onOpenChange,
  ingrediente,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ingrediente?: Ingrediente | null;
}) {
  const { empresa } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!open) return;
    setForm(
      ingrediente
        ? {
            nome: ingrediente.nome,
            unidade: ingrediente.unidade,
            preco_unidade: ingrediente.preco_unidade,
            categoria: ingrediente.categoria,
            fornecedor: ingrediente.fornecedor ?? "",
            estoque_atual: ingrediente.estoque_atual,
          }
        : empty,
    );
  }, [open, ingrediente]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        empresa_id: empresa!.id,
        nome: form.nome.trim(),
        unidade: form.unidade,
        preco_unidade: Number(form.preco_unidade) || 0,
        categoria: form.categoria,
        fornecedor: form.fornecedor.trim() || null,
        estoque_atual: Number(form.estoque_atual) || 0,
      };
      const q = ingrediente
        ? supabase.from("ingredientes").update(payload).eq("id", ingrediente.id)
        : supabase.from("ingredientes").insert(payload);
      const { error } = await q;
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ingredientes"] });
      void qc.invalidateQueries({ queryKey: ["itens-cardapio"] });
      toast.success(ingrediente ? "Ingrediente atualizado." : "Ingrediente cadastrado.");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ingredientes").delete().eq("id", ingrediente!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ingredientes"] });
      toast.success("Ingrediente excluído.");
      onOpenChange(false);
    },
    onError: (e: Error) => {
      if (e.message.includes("foreign key") || e.message.includes("violates")) {
        toast.error("Este ingrediente está em uso em algum item de cardápio e não pode ser excluído.");
      } else toast.error(e.message);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe o nome do ingrediente.");
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{ingrediente ? "Editar ingrediente" : "Novo ingrediente"}</DialogTitle>
            <DialogDescription>Usado na ficha técnica dos itens de cardápio.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="i-nome">Nome</Label>
            <Input id="i-nome" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: Picanha" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={form.unidade} onValueChange={(v) => setForm({ ...form, unidade: v as Enums<"unidade_medida"> })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(UNIDADE_MEDIDA) as Enums<"unidade_medida">[]).map((u) => (
                    <SelectItem key={u} value={u}>{UNIDADE_MEDIDA[u]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="i-preco">Preço por unidade (R$)</Label>
              <Input id="i-preco" type="number" min={0} step="0.01" value={form.preco_unidade} onChange={(e) => setForm({ ...form, preco_unidade: Number(e.target.value) })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="i-estoque">Estoque atual</Label>
              <Input id="i-estoque" type="number" min={0} step="0.01" value={form.estoque_atual} onChange={(e) => setForm({ ...form, estoque_atual: Number(e.target.value) })} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v as Enums<"categoria_ingrediente"> })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORIA_INGREDIENTE) as Enums<"categoria_ingrediente">[]).map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORIA_INGREDIENTE[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="i-fornecedor">Fornecedor</Label>
              <Input id="i-fornecedor" value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} placeholder="Opcional" />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {ingrediente ? (
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={remove.isPending} onClick={() => { if (confirm("Excluir este ingrediente?")) remove.mutate(); }}>
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
