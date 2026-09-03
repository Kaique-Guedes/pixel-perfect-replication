import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, PackagePlus, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Enums } from "@/integrations/supabase/types";
import { CATEGORIA_INGREDIENTE, CATEGORIA_INGREDIENTE_ORDEM, UNIDADE_MEDIDA } from "@/lib/format";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/app/lista-compras")({
  head: () => ({ meta: [{ title: "Lista de compras — Festeja" }] }),
  component: ListaComprasPage,
});

const STATUS_CONSIDERADOS: Enums<"evento_status">[] = ["contrato_assinado", "confirmado"];

type Necessidade = {
  id: string;
  nome: string;
  unidade: Enums<"unidade_medida">;
  categoria: Enums<"categoria_ingrediente">;
  necessario: number;
  estoque: number;
};

function ListaComprasPage() {
  const { empresa } = useAuth();
  const qc = useQueryClient();
  const [dias, setDias] = useState(15);
  const [entradas, setEntradas] = useState<Record<string, number>>({});

  const hoje = new Date().toISOString().slice(0, 10);
  const fim = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: linhas = [], isLoading } = useQuery({
    queryKey: ["lista-compras", hoje, fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("evento_cardapio_itens")
        .select(
          "itens_cardapio(itens_cardapio_ingredientes(quantidade_por_convidado, ingredientes(id, nome, unidade, categoria, estoque_atual))), eventos!inner(data, status, convidados_estimados)",
        )
        .gte("eventos.data", hoje)
        .lte("eventos.data", fim)
        .in("eventos.status", STATUS_CONSIDERADOS);
      if (error) throw error;
      return data;
    },
  });

  const necessidades = useMemo(() => {
    const mapa = new Map<string, Necessidade>();
    for (const linha of linhas) {
      const convidados = linha.eventos?.convidados_estimados ?? 0;
      for (const ficha of linha.itens_cardapio?.itens_cardapio_ingredientes ?? []) {
        const ing = ficha.ingredientes;
        if (!ing) continue;
        const atual: Necessidade = mapa.get(ing.id) ?? {
          id: ing.id,
          nome: ing.nome,
          unidade: ing.unidade,
          categoria: ing.categoria,
          necessario: 0,
          estoque: ing.estoque_atual,
        };
        atual.necessario += ficha.quantidade_por_convidado * convidados;
        mapa.set(ing.id, atual);
      }
    }
    return Array.from(mapa.values())
      .map((i) => ({ ...i, faltante: Math.max(0, i.necessario - i.estoque) }))
      .filter((i) => i.faltante > 0)
      .sort((a, b) => CATEGORIA_INGREDIENTE_ORDEM.indexOf(a.categoria) - CATEGORIA_INGREDIENTE_ORDEM.indexOf(b.categoria) || a.nome.localeCompare(b.nome));
  }, [linhas]);

  const registrarCompra = useMutation({
    mutationFn: async ({ ingredienteId, quantidade }: { ingredienteId: string; quantidade: number }) => {
      const { error } = await supabase.from("movimentacoes_estoque").insert({
        empresa_id: empresa!.id,
        ingrediente_id: ingredienteId,
        tipo: "entrada",
        quantidade,
        observacao: "Compra registrada pela lista de compras",
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      setEntradas((e) => ({ ...e, [vars.ingredienteId]: 0 }));
      void qc.invalidateQueries({ queryKey: ["lista-compras"] });
      void qc.invalidateQueries({ queryKey: ["ingredientes"] });
      toast.success("Entrada de estoque registrada.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Lista de compras"
        description="Ingredientes que faltam para os eventos confirmados, já descontando o estoque atual"
        actions={
          <div className="flex items-center gap-2">
            <Label htmlFor="dias" className="text-sm text-muted-foreground">Próximos</Label>
            <Input id="dias" type="number" min={1} className="w-20" value={dias} onChange={(e) => setDias(Number(e.target.value) || 1)} />
            <span className="text-sm text-muted-foreground">dias</span>
          </div>
        }
      />

      <div className="surface-card overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
        ) : necessidades.length === 0 ? (
          <div className="p-10 text-center">
            <ShoppingCart className="mx-auto mb-3 size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhuma compra necessária para os eventos confirmados nos próximos {dias} dias — o estoque atual cobre tudo.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ingrediente</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Necessário</TableHead>
                <TableHead className="text-right">Em estoque</TableHead>
                <TableHead className="text-right">Falta comprar</TableHead>
                <TableHead className="w-64">Registrar compra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {necessidades.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{CATEGORIA_INGREDIENTE[i.categoria]}</TableCell>
                  <TableCell className="text-right">{i.necessario.toFixed(2)} {UNIDADE_MEDIDA[i.unidade]}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{i.estoque.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <span className="inline-flex items-center gap-1 font-medium text-destructive">
                      <AlertTriangle className="size-3.5" /> {i.faltante.toFixed(2)} {UNIDADE_MEDIDA[i.unidade]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-28"
                        placeholder="Qtd. comprada"
                        value={entradas[i.id] ?? ""}
                        onChange={(e) => setEntradas((prev) => ({ ...prev, [i.id]: Number(e.target.value) }))}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!entradas[i.id] || entradas[i.id] <= 0 || registrarCompra.isPending}
                        onClick={() => registrarCompra.mutate({ ingredienteId: i.id, quantidade: entradas[i.id] })}
                      >
                        <PackagePlus className="size-4" /> Dar entrada
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
