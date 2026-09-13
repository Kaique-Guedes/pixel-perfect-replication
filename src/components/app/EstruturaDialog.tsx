import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { UNIDADE_MEDIDA, calcularCustoEstrutura, formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Estrutura = Tables<"estruturas">;
type Linha = { key: string; ingrediente_id: string; quantidade: number };

let seq = 0;
const novaLinha = (): Linha => ({ key: `novo-${++seq}`, ingrediente_id: "", quantidade: 0 });

export function EstruturaDialog({
  open,
  onOpenChange,
  estrutura,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  estrutura?: Estrutura | null;
}) {
  const { empresa } = useAuth();
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>([novaLinha()]);

  const { data: materiais = [] } = useQuery({
    queryKey: ["materiais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ingredientes").select("id, nome, preco_unidade, unidade").eq("tipo", "material").order("nome");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: composicaoAtual } = useQuery({
    queryKey: ["estrutura-materiais", estrutura?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estruturas_materiais")
        .select("ingrediente_id, quantidade")
        .eq("estrutura_id", estrutura!.id);
      if (error) throw error;
      return data;
    },
    enabled: open && !!estrutura,
  });

  useEffect(() => {
    if (!open) return;
    if (estrutura) {
      setNome(estrutura.nome);
      setLinhas(
        composicaoAtual && composicaoAtual.length > 0
          ? composicaoAtual.map((c) => ({ key: `${c.ingrediente_id}-${Math.random()}`, ingrediente_id: c.ingrediente_id, quantidade: c.quantidade }))
          : [novaLinha()],
      );
    } else {
      setNome("");
      setLinhas([novaLinha()]);
    }
  }, [open, estrutura, composicaoAtual]);

  const composicao = linhas
    .filter((l) => l.ingrediente_id)
    .map((l) => ({ quantidade: l.quantidade, ingredientes: materiais.find((m) => m.id === l.ingrediente_id) ?? null }));
  const custoTotal = calcularCustoEstrutura(composicao);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { empresa_id: empresa!.id, nome: nome.trim() };
      const { data: salva, error } = estrutura
        ? await supabase.from("estruturas").update(payload).eq("id", estrutura.id).select().single()
        : await supabase.from("estruturas").insert(payload).select().single();
      if (error) throw error;

      const estruturaId = salva.id;
      const { error: delError } = await supabase.from("estruturas_materiais").delete().eq("estrutura_id", estruturaId);
      if (delError) throw delError;

      const validas = linhas.filter((l) => l.ingrediente_id && l.quantidade > 0);
      if (validas.length > 0) {
        const { error: insError } = await supabase.from("estruturas_materiais").insert(
          validas.map((l) => ({
            empresa_id: empresa!.id,
            estrutura_id: estruturaId,
            ingrediente_id: l.ingrediente_id,
            quantidade: l.quantidade,
          })),
        );
        if (insError) throw insError;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["estruturas"] });
      void qc.invalidateQueries({ queryKey: ["estrutura-materiais"] });
      toast.success(estrutura ? "Estrutura atualizada." : "Estrutura cadastrada.");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("estruturas").delete().eq("id", estrutura!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["estruturas"] });
      toast.success("Estrutura excluída.");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { toast.error("Dê um nome à estrutura."); return; }
    if (!linhas.some((l) => l.ingrediente_id && l.quantidade > 0)) {
      toast.error("Adicione ao menos um material com quantidade.");
      return;
    }
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{estrutura ? "Editar estrutura" : "Nova estrutura"}</DialogTitle>
            <DialogDescription>Ex.: "Estrutura 100 convidados". O custo é calculado por quantidade × preço de cada material.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="es-nome">Nome da estrutura</Label>
            <Input id="es-nome" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Estrutura 100 convidados" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Materiais</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setLinhas([...linhas, novaLinha()])}>
                <Plus /> Material
              </Button>
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              {linhas.map((linha, idx) => {
                const mat = materiais.find((m) => m.id === linha.ingrediente_id);
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
                      <SelectTrigger className="min-w-[160px] flex-1"><SelectValue placeholder="Selecione o material" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_">Selecione…</SelectItem>
                        {materiais.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      step="1"
                      className="w-24"
                      value={linha.quantidade}
                      onChange={(e) => {
                        const next = [...linhas];
                        next[idx] = { ...linha, quantidade: Number(e.target.value) };
                        setLinhas(next);
                      }}
                    />
                    <span className="w-14 shrink-0 text-xs text-muted-foreground">{mat ? UNIDADE_MEDIDA[mat.unidade] : ""}</span>
                    <Button type="button" variant="ghost" size="icon" onClick={() => setLinhas(linhas.filter((l) => l.key !== linha.key))}>
                      <X className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-accent/50 p-4 text-sm">
            <span className="text-muted-foreground">Custo total da estrutura</span>
            <span className="font-medium text-foreground">{formatCurrency(custoTotal)}</span>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {estrutura ? (
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={remove.isPending} onClick={() => { if (confirm("Excluir esta estrutura?")) remove.mutate(); }}>
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
