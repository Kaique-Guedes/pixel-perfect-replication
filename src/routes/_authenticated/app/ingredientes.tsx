import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Plus, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables } from "@/integrations/supabase/types";
import { CATEGORIA_INGREDIENTE, UNIDADE_MEDIDA, formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/app/PageHeader";
import { IngredienteDialog } from "@/components/app/IngredienteDialog";
import { FuncionarioDialog } from "@/components/app/FuncionarioDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Ingrediente = Tables<"ingredientes">;
type Funcionario = Tables<"funcionarios">;

export const Route = createFileRoute("/_authenticated/app/ingredientes")({
  head: () => ({ meta: [{ title: "Ingredientes, materiais e equipe — Festeja" }] }),
  component: IngredientesPage,
});

function IngredientesPage() {
  const [aba, setAba] = useState<"ingredientes" | "materiais" | "equipe">("ingredientes");

  const { data: insumos = [], isLoading: carregandoInsumos } = useQuery({
    queryKey: ["ingredientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ingredientes").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: funcionarios = [], isLoading: carregandoFuncionarios } = useQuery({
    queryKey: ["funcionarios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("funcionarios").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <PageHeader title="Ingredientes, materiais e equipe" description="Base de preços e da equipe usada no cálculo do orçamento" />

      <Tabs value={aba} onValueChange={(v) => setAba(v as typeof aba)}>
        <TabsList>
          <TabsTrigger value="ingredientes">Ingredientes</TabsTrigger>
          <TabsTrigger value="materiais">Materiais</TabsTrigger>
          <TabsTrigger value="equipe">Equipe</TabsTrigger>
        </TabsList>

        <TabsContent value="ingredientes" className="mt-4">
          <TabelaInsumos tipo="ingrediente" insumos={insumos} isLoading={carregandoInsumos} />
        </TabsContent>
        <TabsContent value="materiais" className="mt-4">
          <TabelaInsumos tipo="material" insumos={insumos} isLoading={carregandoInsumos} />
        </TabsContent>
        <TabsContent value="equipe" className="mt-4">
          <TabelaEquipe funcionarios={funcionarios} isLoading={carregandoFuncionarios} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function TabelaInsumos({ tipo, insumos, isLoading }: { tipo: Enums<"tipo_insumo">; insumos: Ingrediente[]; isLoading: boolean }) {
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<Enums<"categoria_ingrediente"> | "_">("_");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selecionado, setSelecionado] = useState<Ingrediente | null>(null);

  const doTipo = useMemo(() => insumos.filter((i) => i.tipo === tipo), [insumos, tipo]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return doTipo.filter((i) => {
      const bateBusca = !termo || i.nome.toLowerCase().includes(termo) || (i.fornecedor ?? "").toLowerCase().includes(termo);
      const bateCategoria = categoriaFiltro === "_" || i.categoria === categoriaFiltro;
      return bateBusca && bateCategoria;
    });
  }, [doTipo, busca, categoriaFiltro]);

  const abrirNovo = () => {
    setSelecionado(null);
    setDialogOpen(true);
  };

  const abrirEdicao = (i: Ingrediente) => {
    setSelecionado(i);
    setDialogOpen(true);
  };

  const rotulo = tipo === "ingrediente" ? "ingrediente" : "material";

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={`Buscar ${rotulo}…`} className="pl-9" />
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
        <Button onClick={abrirNovo}>
          <Plus /> Novo {rotulo}
        </Button>
      </div>

      <div className="surface-card overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
        ) : filtrados.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {doTipo.length === 0 ? `Nenhum ${rotulo} cadastrado ainda.` : `Nenhum ${rotulo} encontrado com esse filtro.`}
            </p>
            {doTipo.length === 0 && (
              <Button variant="outline" className="mt-4" onClick={abrirNovo}>
                <Plus /> Cadastrar o primeiro {rotulo}
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

      <IngredienteDialog open={dialogOpen} onOpenChange={setDialogOpen} ingrediente={selecionado} tipoPadrao={tipo} />
    </>
  );
}

function TabelaEquipe({ funcionarios, isLoading }: { funcionarios: Funcionario[]; isLoading: boolean }) {
  const [busca, setBusca] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selecionado, setSelecionado] = useState<Funcionario | null>(null);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return funcionarios.filter((f) => !termo || f.nome.toLowerCase().includes(termo) || f.funcao.toLowerCase().includes(termo));
  }, [funcionarios, busca]);

  const abrirNovo = () => {
    setSelecionado(null);
    setDialogOpen(true);
  };

  const abrirEdicao = (f: Funcionario) => {
    setSelecionado(f);
    setDialogOpen(true);
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou função…" className="pl-9" />
        </div>
        <Button onClick={abrirNovo}>
          <Plus /> Novo funcionário
        </Button>
      </div>

      <div className="surface-card overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
        ) : filtrados.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-muted-foreground">
              {funcionarios.length === 0 ? "Nenhum funcionário cadastrado ainda." : "Nenhum funcionário encontrado com esse filtro."}
            </p>
            {funcionarios.length === 0 && (
              <Button variant="outline" className="mt-4" onClick={abrirNovo}>
                <Plus /> Cadastrar o primeiro funcionário
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Função</TableHead>
                <TableHead className="text-right">Valor / hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((f) => (
                <TableRow key={f.id} className="cursor-pointer" onClick={() => abrirEdicao(f)}>
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{f.funcao}</TableCell>
                  <TableCell className="text-right">{formatCurrency(f.valor_hora)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <FuncionarioDialog open={dialogOpen} onOpenChange={setDialogOpen} funcionario={selecionado} />
    </>
  );
}
