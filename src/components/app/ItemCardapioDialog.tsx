import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Enums, Tables } from "@/integrations/supabase/types";
import { CATEGORIA_ITEM_CARDAPIO, UNIDADE_MEDIDA, calcularCustoItemCardapio, formatCurrency } from "@/lib/format";
import { MargemBadge } from "@/components/app/MargemBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ItemCardapio = Tables<"itens_cardapio">;
type FichaLinha = { key: string; ingrediente_id: string; quantidade_por_convidado: number };

let seq = 0;
const novaLinha = (): FichaLinha => ({ key: `novo-${++seq}`, ingrediente_id: "", quantidade_por_convidado: 0 });

export function ItemCardapioDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  item?: ItemCardapio | null;
}) {
  const { empresa } = useAuth();
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState<Enums<"categoria_item_cardapio">>("prato_principal");
  const [linhas, setLinhas] = useState<FichaLinha[]>([novaLinha()]);

  const { data: ingredientes = [] } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ingredientes").select("id, nome, preco_unidade, unidade").order("nome");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: fichaAtual } = useQuery({
    queryKey: ["ficha-tecnica", item?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_cardapio_ingredientes")
        .select("ingrediente_id, quantidade_por_convidado")
        .eq("item_cardapio_id", item!.id);
      if (error) throw error;
      return data;
    },
    enabled: open && !!item,
  });

  useEffect(() => {
    if (!open) return;
    if (item) {
      setNome(item.nome);
      setCategoria(item.categoria);
      setLinhas(
        fichaAtual && fichaAtual.length > 0
          ? fichaAtual.map((f) => ({ key: `${f.ingrediente_id}-${Math.random()}`, ingrediente_id: f.ingrediente_id, quantidade_por_convidado: f.quantidade_por_convidado }))
          : [novaLinha()],
      );
    } else {
      setNome("");
      setCategoria("prato_principal");
      setLinhas([novaLinha()]);
    }
  }, [open, item, fichaAtual]);

  const ficha = linhas
    .filter((l) => l.ingrediente_id)
    .map((l) => ({
      quantidade_por_convidado: l.quantidade_por_convidado,
      ingredientes: ingredientes.find((i) => i.id === l.ingrediente_id) ?? null,
    }));
  const { custoConvidado, precoVendaConvidado, margem } = calcularCustoItemCardapio(ficha, empresa?.markup_padrao ?? 100);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { empresa_id: empresa!.id, nome: nome.trim(), categoria };
      const { data: savedItem, error } = item
        ? await supabase.from("itens_cardapio").update(payload).eq("id", item.id).select().single()
        : await supabase.from("itens_cardapio").insert(payload).select().single();
      if (error) throw error;

      const itemId = savedItem.id;
      const { error: delError } = await supabase.from("itens_cardapio_ingredientes").delete().eq("item_cardapio_id", itemId);
      if (delError) throw delError;

      const linhasValidas = linhas.filter((l) => l.ingrediente_id && l.quantidade_por_convidado > 0);
      if (linhasValidas.length > 0) {
        const { error: insError } = await supabase.from("itens_cardapio_ingredientes").insert(
          linhasValidas.map((l) => ({
            empresa_id: empresa!.id,
            item_cardapio_id: itemId,
            ingrediente_id: l.ingrediente_id,
            quantidade_por_convidado: l.quantidade_por_convidado,
          })),
        );
        if (insError) throw insError;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["itens-cardapio"] });
      void qc.invalidateQueries({ queryKey: ["ficha-tecnica"] });
      toast.success(item ? "Item de cardápio atualizado." : "Item de cardápio cadastrado.");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("itens_cardapio").delete().eq("id", item!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["itens-cardapio"] });
      toast.success("Item de cardápio excluído.");
      onOpenChange(false);
    },
    onError: (e: Error) => {
      if (e.message.includes("foreign key") || e.message.includes("violates")) {
        toast.error("Este item está usado em algum evento e não pode ser excluído.");
      } else toast.error(e.message);
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return toast.error("Informe o nome do item.");
    if (!linhas.some((l) => l.ingrediente_id && l.quantidade_por_convidado > 0)) {
      return toast.error("Adicione ao menos um ingrediente com quantidade por convidado.");
    }
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{item ? "Editar item de cardápio" : "Novo item de cardápio"}</DialogTitle>
            <DialogDescription>O preço de venda é calculado automaticamente pela ficha técnica + markup da empresa.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <div className="space-y-2">
              <Label htmlFor="ic-nome">Nome do prato</Label>
              <Input id="ic-nome" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Picanha ao ponto" />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as Enums<"categoria_item_cardapio">)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORIA_ITEM_CARDAPIO) as Enums<"categoria_item_cardapio">[]).map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORIA_ITEM_CARDAPIO[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Ficha técnica (ingredientes por convidado)</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setLinhas([...linhas, novaLinha()])}>
                <Plus /> Ingrediente
              </Button>
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              {linhas.map((linha, idx) => {
                const ing = ingredientes.find((i) => i.id === linha.ingrediente_id);
                return (
                  <div key={linha.key} className="flex flex-wrap items-center gap-2">
                    <Select
                      value={linha.ingrediente_id || "_"}
                      onValueChange={(v) => {
                        const next = [...linhas];
                        next[idx] = { ...linha, ingrediente_id: v === "_" ? "" : v };
                        setLinhas(next);
                      }}
                    >
                      <SelectTrigger className="min-w-[160px] flex-1"><SelectValue placeholder="Selecione o ingrediente" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_">Selecione…</SelectItem>
                        {ingredientes.map((i) => <SelectItem key={i.id} value={i.id}>{i.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      step="0.001"
                      className="w-28"
                      value={linha.quantidade_por_convidado}
                      onChange={(e) => {
                        const next = [...linhas];
                        next[idx] = { ...linha, quantidade_por_convidado: Number(e.target.value) };
                        setLinhas(next);
                      }}
                    />
                    <span className="w-14 shrink-0 text-xs text-muted-foreground">{ing ? UNIDADE_MEDIDA[ing.unidade] : ""}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setLinhas(linhas.filter((l) => l.key !== linha.key))}>
                      <X className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-accent/50 p-4">
            <div className="text-sm">
              <p className="text-muted-foreground">Custo por convidado: <span className="font-medium text-foreground">{formatCurrency(custoConvidado)}</span></p>
              <p className="text-muted-foreground">Preço de venda por convidado: <span className="font-medium text-foreground">{formatCurrency(precoVendaConvidado)}</span></p>
            </div>
            <MargemBadge margem={margem} margemAlvo={empresa?.margem_alvo ?? 35} margemMinima={empresa?.margem_minima ?? 20} />
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {item ? (
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={remove.isPending} onClick={() => { if (confirm("Excluir este item de cardápio?")) remove.mutate(); }}>
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
