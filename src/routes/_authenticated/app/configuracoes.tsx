import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Enums } from "@/integrations/supabase/types";
import { TIPO_NEGOCIO } from "@/lib/format";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/app/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Festeja" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { empresa, isAdmin, refreshPerfil } = useAuth();
  const [form, setForm] = useState({
    nome: "",
    cnpj: "",
    telefone: "",
    endereco: "",
    tipo_negocio: "buffet" as Enums<"tipo_negocio">,
  });

  useEffect(() => {
    if (!empresa) return;
    setForm({
      nome: empresa.nome,
      cnpj: empresa.cnpj ?? "",
      telefone: empresa.telefone ?? "",
      endereco: empresa.endereco ?? "",
      tipo_negocio: empresa.tipo_negocio ?? "buffet",
    });
  }, [empresa]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("empresas")
        .update({
          nome: form.nome.trim(),
          cnpj: form.cnpj.trim() || null,
          telefone: form.telefone.trim() || null,
          endereco: form.endereco.trim() || null,
          tipo_negocio: form.tipo_negocio,
        })
        .eq("id", empresa!.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshPerfil();
      toast.success("Configurações salvas.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { toast.error("Informe o nome da empresa."); return; }
    save.mutate();
  };

  if (!empresa) return null;

  return (
    <>
      <PageHeader title="Configurações" description="Dados da empresa" />

      <form onSubmit={submit} className="surface-card max-w-2xl space-y-6 p-6">
        <fieldset disabled={!isAdmin} className="space-y-6 disabled:opacity-60">
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <div className="space-y-2">
              <Label htmlFor="cfg-nome">Nome da empresa</Label>
              <Input id="cfg-nome" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfg-cnpj">CNPJ</Label>
              <Input id="cfg-cnpj" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="Opcional" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
            <div className="space-y-2">
              <Label htmlFor="cfg-telefone">Telefone</Label>
              <Input id="cfg-telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(31) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cfg-endereco">Endereço</Label>
              <Input id="cfg-endereco" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, número, bairro, cidade — UF" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de negócio</Label>
            <Select value={form.tipo_negocio} onValueChange={(v) => setForm({ ...form, tipo_negocio: v as Enums<"tipo_negocio"> })}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(TIPO_NEGOCIO) as Enums<"tipo_negocio">[]).map((t) => (
                  <SelectItem key={t} value={t}>{TIPO_NEGOCIO[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border-t pt-6">
            <p className="text-xs text-muted-foreground">
              A margem de lucro do orçamento agora é definida em cada evento, não mais aqui — veja a tela do evento.
            </p>
          </div>

          <div className="flex items-center justify-between">
            {!isAdmin && <p className="text-xs text-muted-foreground">Somente administradores podem editar estas configurações.</p>}
            <Button type="submit" disabled={save.isPending || !isAdmin} className="ml-auto">
              {save.isPending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </div>
        </fieldset>
      </form>
    </>
  );
}
