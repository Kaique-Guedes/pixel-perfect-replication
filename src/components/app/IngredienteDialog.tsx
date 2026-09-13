import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Enums, Tables } from "@/integrations/supabase/types";
import { CATEGORIA_INGREDIENTE, TIPO_INSUMO, UNIDADE_MEDIDA } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Ingrediente = Tables<"ingredientes">;

const emptyFor = (tipo: Enums<"tipo_insumo">) => ({
  nome: "",
  tipo,
  unidade: "unidade" as Enums<"unidade_medida">,
  preco_unidade: 0,
  categoria: "outro" as Enums<"categoria_ingrediente">,
  fornecedor: "",
  estoque_atual: 0,
});

export function IngredienteDialog({
  open,
  onOpenChange,
  ingrediente,
  tipoPadrao = "ingrediente",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ingrediente?: Ingrediente | null;
  /** Tipo pré-selecionado ao criar um novo registro (ignorado ao editar). */
  tipoPadrao?: Enums<"tipo_insumo">;
}) {
  const { empresa } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyFor(tipoPadrao));

  useEffect(() => {
    if (!open) return;
    setForm(
      ingrediente
        ? {
            nome: ingrediente.nome,
            tipo: ingrediente.tipo,
            unidade: ingrediente.unidade,
            preco_unidade: ingrediente.preco_unidade,
            categoria: ingrediente.categoria,
            fornecedor: ingrediente.fornecedor ?? "",
            estoque_atual: ingrediente.estoque_atual,
          }
        : emptyFor(tipoPadrao),
    );
  }, [open, ingrediente, tipoPadrao]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        empresa_id: empresa!.id,
        nome: form.nome.trim(),
        tipo: form.tipo,
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
      void qc.invalidateQueries({ queryKey: ["materiais"] });
      toast.success(ingrediente ? `${TIPO_INSUMO[form.tipo]} atualizado.` : `${TIPO_INSUMO[form.tipo]} cadastrado.`);
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
      void qc.invalidateQueries({ queryKey: ["materiais"] });
      toast.success(`${TIPO_INSUMO[form.tipo]} excluído.`);
      onOpenChange(false);
    },
    onError: (e: Error) => {
      if (e.message.includes("foreign key") || e.message.includes("violates")) {
        toast.error("Este item está em uso (num prato ou orçamento) e não pode ser excluído.");
      } else toast.error(e.message);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error(`Informe o nome do ${TIPO_INSUMO[form.tipo].toLowerCase()}.`); return; }
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{ingrediente ? `Editar ${TIPO_INSUMO[form.tipo].toLowerCase()}` : `Novo ${TIPO_INSUMO[form.tipo].toLowerCase()}`}</DialogTitle>
            <DialogDescription>
              {form.tipo === "ingrediente" ? "Usado na ficha técnica dos itens de cardápio." : "Usado direto no orçamento do evento (mesa, cadeira, descartáveis etc.)."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <div className="space-y-2">
              <Label htmlFor="i-nome">Nome</Label>
              <Input id="i-nome" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder={form.tipo === "ingrediente" ? "Ex.: Picanha" : "Ex.: Cadeira"} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as Enums<"tipo_insumo"> })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPO_INSUMO) as Enums<"tipo_insumo">[]).map((t) => (
                    <SelectItem key={t} value={t}>{TIPO_INSUMO[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={remove.isPending} onClick={() => { if (confirm(`Excluir este ${TIPO_INSUMO[form.tipo].toLowerCase()}?`)) remove.mutate(); }}>
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
