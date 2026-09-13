import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { calcularCustoEquipe, formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Equipe = Tables<"equipes">;
type Linha = { key: string; funcionario_id: string; horas: number };

let seq = 0;
const novaLinha = (): Linha => ({ key: `novo-${++seq}`, funcionario_id: "", horas: 0 });

export function EquipeDialog({
  open,
  onOpenChange,
  equipe,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  equipe?: Equipe | null;
}) {
  const { empresa } = useAuth();
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [linhas, setLinhas] = useState<Linha[]>([novaLinha()]);

  const { data: funcionarios = [] } = useQuery({
    queryKey: ["funcionarios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("funcionarios").select("id, nome, funcao, valor_hora").order("nome");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const { data: composicaoAtual } = useQuery({
    queryKey: ["equipe-funcionarios", equipe?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipes_funcionarios")
        .select("funcionario_id, horas")
        .eq("equipe_id", equipe!.id);
      if (error) throw error;
      return data;
    },
    enabled: open && !!equipe,
  });

  useEffect(() => {
    if (!open) return;
    if (equipe) {
      setNome(equipe.nome);
      setLinhas(
        composicaoAtual && composicaoAtual.length > 0
          ? composicaoAtual.map((c) => ({ key: `${c.funcionario_id}-${Math.random()}`, funcionario_id: c.funcionario_id, horas: c.horas }))
          : [novaLinha()],
      );
    } else {
      setNome("");
      setLinhas([novaLinha()]);
    }
  }, [open, equipe, composicaoAtual]);

  const composicao = linhas
    .filter((l) => l.funcionario_id)
    .map((l) => ({ horas: l.horas, funcionarios: funcionarios.find((f) => f.id === l.funcionario_id) ?? null }));
  const custoTotal = calcularCustoEquipe(composicao);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { empresa_id: empresa!.id, nome: nome.trim() };
      const { data: salva, error } = equipe
        ? await supabase.from("equipes").update(payload).eq("id", equipe.id).select().single()
        : await supabase.from("equipes").insert(payload).select().single();
      if (error) throw error;

      const equipeId = salva.id;
      const { error: delError } = await supabase.from("equipes_funcionarios").delete().eq("equipe_id", equipeId);
      if (delError) throw delError;

      const validas = linhas.filter((l) => l.funcionario_id && l.horas > 0);
      if (validas.length > 0) {
        const { error: insError } = await supabase.from("equipes_funcionarios").insert(
          validas.map((l) => ({
            empresa_id: empresa!.id,
            equipe_id: equipeId,
            funcionario_id: l.funcionario_id,
            horas: l.horas,
          })),
        );
        if (insError) throw insError;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["equipes"] });
      void qc.invalidateQueries({ queryKey: ["equipe-funcionarios"] });
      toast.success(equipe ? "Equipe atualizada." : "Equipe cadastrada.");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("equipes").delete().eq("id", equipe!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["equipes"] });
      toast.success("Equipe excluída.");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) { toast.error("Dê um nome à equipe."); return; }
    if (!linhas.some((l) => l.funcionario_id && l.horas > 0)) {
      toast.error("Adicione ao menos um funcionário com horas.");
      return;
    }
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{equipe ? "Editar equipe" : "Nova equipe"}</DialogTitle>
            <DialogDescription>Ex.: "Equipe padrão casamento". O custo é calculado por horas × valor/hora de cada funcionário.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="eq-nome">Nome da equipe</Label>
            <Input id="eq-nome" required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Equipe padrão casamento" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Funcionários</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setLinhas([...linhas, novaLinha()])}>
                <Plus /> Funcionário
              </Button>
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              {linhas.map((linha, idx) => {
                const func = funcionarios.find((f) => f.id === linha.funcionario_id);
                return (
                  <div key={linha.key} className="flex flex-wrap items-center gap-2">
                    <Select
                      value={linha.funcionario_id || "_"}
                      onValueChange={(v) => {
                        const next = [...linhas];
                        next[idx] = { ...linha, funcionario_id: v === "_" ? "" : v };
                        setLinhas(next);
                      }}
                    >
                      <SelectTrigger className="min-w-[160px] flex-1"><SelectValue placeholder="Selecione o funcionário" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_">Selecione…</SelectItem>
                        {funcionarios.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome} ({f.funcao})</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      step="0.5"
                      className="w-24"
                      value={linha.horas}
                      onChange={(e) => {
                        const next = [...linhas];
                        next[idx] = { ...linha, horas: Number(e.target.value) };
                        setLinhas(next);
                      }}
                    />
                    <span className="w-10 shrink-0 text-xs text-muted-foreground">horas</span>
                    {func && <span className="text-xs text-muted-foreground">{formatCurrency(func.valor_hora * linha.horas)}</span>}
                    <Button type="button" variant="ghost" size="icon" onClick={() => setLinhas(linhas.filter((l) => l.key !== linha.key))}>
                      <X className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg bg-accent/50 p-4 text-sm">
            <span className="text-muted-foreground">Custo total da equipe</span>
            <span className="font-medium text-foreground">{formatCurrency(custoTotal)}</span>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {equipe ? (
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" disabled={remove.isPending} onClick={() => { if (confirm("Excluir esta equipe?")) remove.mutate(); }}>
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
