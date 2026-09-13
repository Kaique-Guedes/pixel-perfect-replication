import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables } from "@/integrations/supabase/types";
import { CATEGORIA_ITEM_CARDAPIO, calcularCustoEquipe, calcularCustoEstrutura, calcularCustoItemCardapio, formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/app/PageHeader";
import { ItemCardapioDialog } from "@/components/app/ItemCardapioDialog";
import { EquipeDialog } from "@/components/app/EquipeDialog";
import { EstruturaDialog } from "@/components/app/EstruturaDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ItemCardapio = Tables<"itens_cardapio">;
type Equipe = Tables<"equipes">;
type Estrutura = Tables<"estruturas">;

export const Route = createFileRoute("/_authenticated/app/cardapio")({
  head: () => ({ meta: [{ title: "Cardápio — Festeja" }] }),
  component: CardapioPage,
});

function CardapioPage() {
  const [aba, setAba] = useState<"pratos" | "equipe" | "estruturas">("pratos");

  return (
    <>
      <PageHeader title="Cardápio" description="Pratos, equipe e estruturas com custo calculado automaticamente" />

      <Tabs value={aba} onValueChange={(v) => setAba(v as typeof aba)}>
        <TabsList>
          <TabsTrigger value="pratos">Pratos</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
          <TabsTrigger value="estruturas">Estruturas</TabsTrigger>
        </TabsList>

        <TabsContent value="pratos" className="mt-4">
          <AbaPratos />
        </TabsContent>
        <TabsContent value="equipe" className="mt-4">
          <AbaEquipe />
        </TabsContent>
        <TabsContent value="estruturas" className="mt-4">
          <AbaEstruturas />
        </TabsContent>
      </Tabs>
    </>
  );
}

function AbaPratos() {
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

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap gap-3">
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
        <Button onClick={abrirNovo}>
          <Plus /> Novo item
        </Button>
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
                <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                <TableHead className="text-right">Custo / convidado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((i) => {
                const { custoConvidado } = calcularCustoItemCardapio(i.itens_cardapio_ingredientes);
                return (
                  <TableRow key={i.id} className="cursor-pointer" onClick={() => abrirEdicao(i)}>
                    <TableCell className="font-medium">{i.nome}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{CATEGORIA_ITEM_CARDAPIO[i.categoria]}</TableCell>
                    <TableCell className="text-right">{formatCurrency(custoConvidado)}</TableCell>
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

function AbaEquipe() {
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selecionada, setSelecionada] = useState<Equipe | null>(null);

  const { data: equipes = [], isLoading } = useQuery({
    queryKey: ["equipes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipes")
        .select("*, equipes_funcionarios(horas, funcionarios(valor_hora))")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return equipes.filter((e) => !termo || e.nome.toLowerCase().includes(termo));
  }, [equipes, busca]);

  const abrirNovo = () => {
    setSelecionada(null);
    setDialogOpen(true);
  };

  const abrirEdicao = (e: Equipe) => {
    setSelecionada(e);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar equipe…" className="pl-9" />
        </div>
        <Button onClick={abrirNovo}>
          <Plus /> Nova equipe
        </Button>
      </div>

      <div className="surface-card overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
        ) : filtrados.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {equipes.length === 0 ? "Nenhuma equipe cadastrada ainda." : "Nenhuma equipe encontrada com esse filtro."}
            </p>
            {equipes.length === 0 && (
              <Button variant="outline" className="mt-4" onClick={abrirNovo}>
                <Plus /> Cadastrar a primeira equipe
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipe</TableHead>
                <TableHead className="hidden sm:table-cell">Funcionários</TableHead>
                <TableHead className="text-right">Custo total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((e) => {
                const custo = calcularCustoEquipe(e.equipes_funcionarios);
                return (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => abrirEdicao(e)}>
                    <TableCell className="font-medium">{e.nome}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{e.equipes_funcionarios.length}</TableCell>
                    <TableCell className="text-right">{formatCurrency(custo)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <EquipeDialog open={dialogOpen} onOpenChange={setDialogOpen} equipe={selecionada} />
    </>
  );
}

function AbaEstruturas() {
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selecionada, setSelecionada] = useState<Estrutura | null>(null);

  const { data: estruturas = [], isLoading } = useQuery({
    queryKey: ["estruturas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("estruturas")
        .select("*, estruturas_materiais(quantidade_por_convidado, ingredientes(preco_unidade))")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return estruturas.filter((e) => !termo || e.nome.toLowerCase().includes(termo));
  }, [estruturas, busca]);

  const abrirNovo = () => {
    setSelecionada(null);
    setDialogOpen(true);
  };

  const abrirEdicao = (e: Estrutura) => {
    setSelecionada(e);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar estrutura…" className="pl-9" />
        </div>
        <Button onClick={abrirNovo}>
          <Plus /> Nova estrutura
        </Button>
      </div>

      <div className="surface-card overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
        ) : filtrados.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {estruturas.length === 0 ? "Nenhuma estrutura cadastrada ainda." : "Nenhuma estrutura encontrada com esse filtro."}
            </p>
            {estruturas.length === 0 && (
              <Button variant="outline" className="mt-4" onClick={abrirNovo}>
                <Plus /> Cadastrar a primeira estrutura
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estrutura</TableHead>
                <TableHead className="hidden sm:table-cell">Materiais</TableHead>
                <TableHead className="text-right">Custo / convidado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((e) => {
                const custo = calcularCustoEstrutura(e.estruturas_materiais);
                return (
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => abrirEdicao(e)}>
                    <TableCell className="font-medium">{e.nome}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{e.estruturas_materiais.length}</TableCell>
                    <TableCell className="text-right">{formatCurrency(custo)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <EstruturaDialog open={dialogOpen} onOpenChange={setDialogOpen} estrutura={selecionada} />
    </>
  );
}
