import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables } from "@/integrations/supabase/types";
import { CATEGORIA_INGREDIENTE, UNIDADE_MEDIDA, formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/app/PageHeader";
import { IngredienteDialog } from "@/components/app/IngredienteDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Ingrediente = Tables<"ingredientes">;

export const Route = createFileRoute("/_authenticated/app/ingredientes")({
  head: () => ({ meta: [{ title: "Ingredientes — Festeja" }] }),
  component: IngredientesPage,
});

function IngredientesPage() {
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<Enums<"categoria_ingrediente"> | "_">("_");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selecionado, setSelecionado] = useState<Ingrediente | null>(null);

  const { data: ingredientes = [], isLoading } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ingredientes").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return ingredientes.filter((i) => {
      const bateBusca = !termo || i.nome.toLowerCase().includes(termo) || (i.fornecedor ?? "").toLowerCase().includes(termo);
      const bateCategoria = categoriaFiltro === "_" || i.categoria === categoriaFiltro;
      return bateBusca && bateCategoria;
    });
  }, [ingredientes, busca, categoriaFiltro]);

  const abrirNovo = () => {
    setSelecionado(null);
    setDialogOpen(true);
  };

  const abrirEdicao = (i: Ingrediente) => {
    setSelecionado(i);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Ingredientes"
        description="Base de preços usada no cálculo automático do cardápio"
        actions={
          <Button onClick={abrirNovo}>
            <Plus /> Novo ingrediente
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou fornecedor…" className="pl-9" />
        </div>
        <Select value={categoriaFiltro} onValueChange={(v) => setCategoriaFiltro(v as typeof categoriaFiltro)}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_">Todas as categorias</SelectItem>
            {(Object.keys(CATEGORIA_INGREDIENTE) as Enums<"categoria_ingrediente">[]).map((c) => (
              <SelectItem key={c} value={c}>{CATEGORIA_INGREDIENTE[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="surface-card overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
        ) : filtrados.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {ingredientes.length === 0 ? "Nenhum ingrediente cadastrado ainda." : "Nenhum ingrediente encontrado com esse filtro."}
            </p>
            {ingredientes.length === 0 && (
              <Button variant="outline" className="mt-4" onClick={abrirNovo}>
                <Plus /> Cadastrar o primeiro ingrediente
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                <TableHead className="hidden md:table-cell">Fornecedor</TableHead>
                <TableHead className="text-right">Preço / unidade</TableHead>
                <TableHead className="text-right">Estoque atual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((i) => (
                <TableRow key={i.id} className="cursor-pointer" onClick={() => abrirEdicao(i)}>
                  <TableCell className="font-medium">{i.nome}</TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">{CATEGORIA_INGREDIENTE[i.categoria]}</TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{i.fornecedor || "—"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(i.preco_unidade)} / {UNIDADE_MEDIDA[i.unidade]}</TableCell>
                  <TableCell className="text-right">
                    <span className={i.estoque_atual <= 0 ? "inline-flex items-center gap-1 text-destructive" : ""}>
                      {i.estoque_atual <= 0 && <AlertTriangle className="size-3.5" />}
                      {i.estoque_atual} {UNIDADE_MEDIDA[i.unidade]}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <IngredienteDialog open={dialogOpen} onOpenChange={setDialogOpen} ingrediente={selecionado} />
    </>
  );
}
