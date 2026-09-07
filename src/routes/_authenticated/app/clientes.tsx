import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables } from "@/integrations/supabase/types";
import { formatDate, CLIENTE_STATUS } from "@/lib/format";
import { PageHeader } from "@/components/app/PageHeader";
import { ClienteStatusBadge } from "@/components/app/StatusBadge";
import { ClienteDialog } from "@/components/app/ClienteDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Cliente = Tables<"clientes">;

export const Route = createFileRoute("/_authenticated/app/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Festeja" }] }),
  component: ClientesPage,
});

function ClientesPage() {
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<Enums<"cliente_status"> | "_">("_");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selecionado, setSelecionado] = useState<Cliente | null>(null);

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clientes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return clientes.filter((c) => {
      const bateBusca =
        !termo ||
        c.nome.toLowerCase().includes(termo) ||
        (c.telefone ?? "").toLowerCase().includes(termo) ||
        (c.email ?? "").toLowerCase().includes(termo);
      const bateStatus = statusFiltro === "_" || c.status === statusFiltro;
      return bateBusca && bateStatus;
    });
  }, [clientes, busca, statusFiltro]);

  const abrirNovo = () => {
    setSelecionado(null);
    setDialogOpen(true);
  };

  const abrirEdicao = (c: Cliente) => {
    setSelecionado(c);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Clientes"
        description={`${clientes.length} cliente${clientes.length === 1 ? "" : "s"} cadastrado${clientes.length === 1 ? "" : "s"}`}
        actions={
          <Button onClick={abrirNovo}>
            <UserPlus /> Novo cliente
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou e-mail…"
            className="pl-9"
          />
        </div>
        <Select value={statusFiltro} onValueChange={(v) => setStatusFiltro(v as typeof statusFiltro)}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_">Todos os status</SelectItem>
            {(Object.keys(CLIENTE_STATUS) as Enums<"cliente_status">[]).map((s) => (
              <SelectItem key={s} value={s}>{CLIENTE_STATUS[s]}</SelectItem>
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
              {clientes.length === 0 ? "Nenhum cliente cadastrado ainda." : "Nenhum cliente encontrado com esse filtro."}
            </p>
            {clientes.length === 0 && (
              <Button variant="outline" className="mt-4" onClick={abrirNovo}>
                <UserPlus /> Cadastrar o primeiro cliente
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Cadastrado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => abrirEdicao(c)}>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.telefone || c.email || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.origem || "—"}</TableCell>
                  <TableCell><ClienteStatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ClienteDialog open={dialogOpen} onOpenChange={setDialogOpen} cliente={selecionado} />
    </>
  );
}
