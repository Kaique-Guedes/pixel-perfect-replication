import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Enums, Tables } from "@/integrations/supabase/types";
import { CATEGORIA_ITEM_CARDAPIO, calcularCustoItemCardapio, formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/app/PageHeader";
import { MargemBadge } from "@/components/app/MargemBadge";
import { ItemCardapioDialog } from "@/components/app/ItemCardapioDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ItemCardapio = Tables<"itens_cardapio">;

export const Route = createFileRoute("/_authenticated/app/cardapio")({
  head: () => ({ meta: [{ title: "Cardápio — Festeja" }] }),
  component: CardapioPage,
});

function CardapioPage() {
  const { empresa } = useAuth();
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<Enums<"categoria_item_cardapio"> | "_">("_");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selecionado, setSelecionado] = useState<ItemCardapio | null>(null);

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ["itens-cardapio"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_cardapio")
        .select("*, itens_cardapio_ingredientes(quantidade_por_convidado, ingredientes(preco_unidade))")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return itens.filter((i) => {
      const bateBusca = !termo || i.nome.toLowerCase().includes(termo);
      const bateCategoria = categoriaFiltro === "_" || i.categoria === categoriaFiltro;
      return bateBusca && bateCategoria;
    });
  }, [itens, busca, categoriaFiltro]);

  const abrirNovo = () => {
    setSelecionado(null);
    setDialogOpen(true);
  };

  const abrirEdicao = (i: ItemCardapio) => {
    setSelecionado(i);
    setDialogOpen(true);
  };

  const markup = empresa?.markup_padrao ?? 100;
  const margemAlvo = empresa?.margem_alvo ?? 35;
  const margemMinima = empresa?.margem_minima ?? 20;

  return (
    <>
      <PageHeader
        title="Cardápio"
        description="Preço de venda e margem calculados automaticamente pela ficha técnica"
        actions={
          <Button onClick={abrirNovo}>
            <Plus /> Novo item
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome do prato…" className="pl-9" />
        </div>
        <Select value={categoriaFiltro} onValueChange={(v) => setCategoriaFiltro(v as typeof categoriaFiltro)}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_">Todas as categorias</SelectItem>
            {(Object.keys(CATEGORIA_ITEM_CARDAPIO) as Enums<"categoria_item_cardapio">[]).map((c) => (
              <SelectItem key={c} value={c}>{CATEGORIA_ITEM_CARDAPIO[c]}</SelectItem>
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
              {itens.length === 0 ? "Nenhum item de cardápio cadastrado ainda." : "Nenhum item encontrado com esse filtro."}
            </p>
            {itens.length === 0 && (
              <Button variant="outline" className="mt-4" onClick={abrirNovo}>
                <Plus /> Cadastrar o primeiro item
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prato</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Custo / convidado</TableHead>
                <TableHead className="text-right">Venda / convidado</TableHead>
                <TableHead className="text-right">Margem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((i) => {
                const { custoConvidado, precoVendaConvidado, margem } = calcularCustoItemCardapio(
                  i.itens_cardapio_ingredientes,
                  markup,
                );
                return (
                  <TableRow key={i.id} className="cursor-pointer" onClick={() => abrirEdicao(i)}>
                    <TableCell className="font-medium">{i.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{CATEGORIA_ITEM_CARDAPIO[i.categoria]}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(custoConvidado)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(precoVendaConvidado)}</TableCell>
                    <TableCell className="text-right">
                      <MargemBadge margem={margem} margemAlvo={margemAlvo} margemMinima={margemMinima} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <ItemCardapioDialog open={dialogOpen} onOpenChange={setDialogOpen} item={selecionado} />
    </>
  );
}
