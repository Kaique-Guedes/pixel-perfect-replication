import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ListChecks, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { PageHeader } from "@/components/app/PageHeader";
import { ChecklistDialog } from "@/components/app/ChecklistDialog";
import { Button } from "@/components/ui/button";

type Checklist = Tables<"checklists">;

export const Route = createFileRoute("/_authenticated/app/checklists")({
  head: () => ({ meta: [{ title: "Checklists — Festeja" }] }),
  component: ChecklistsPage,
});

function ChecklistsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selecionado, setSelecionado] = useState<Checklist | null>(null);

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["checklists"],
    queryFn: async () => {
      const { data, error } = await supabase.from("checklists").select("*, checklist_template_itens(id)").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const abrirNovo = () => {
    setSelecionado(null);
    setDialogOpen(true);
  };

  const abrirEdicao = (c: Checklist) => {
    setSelecionado(c);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Checklists"
        description="Templates reutilizáveis para aplicar a qualquer evento"
        actions={
          <Button onClick={abrirNovo}>
            <Plus /> Novo checklist
          </Button>
        }
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : checklists.length === 0 ? (
        <div className="surface-card p-10 text-center">
          <ListChecks className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhum checklist cadastrado ainda.</p>
          <Button variant="outline" className="mt-4" onClick={abrirNovo}>
            <Plus /> Criar o primeiro checklist
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {checklists.map((c) => (
            <button
              key={c.id}
              onClick={() => abrirEdicao(c)}
              className="surface-card p-5 text-left transition-shadow hover:shadow-md"
            >
              <p className="font-medium">{c.nome}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {c.checklist_template_itens.length} tarefa{c.checklist_template_itens.length === 1 ? "" : "s"}
              </p>
            </button>
          ))}
        </div>
      )}

      <ChecklistDialog open={dialogOpen} onOpenChange={setDialogOpen} checklist={selecionado} />
    </>
  );
}
