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
    tipo_negocio: "buffet" as Enums<"tipo_negocio">,
    markup_padrao: 100,
    margem_alvo: 35,
    margem_minima: 20,
  });

  useEffect(() => {
    if (!empresa) return;
    setForm({
      nome: empresa.nome,
      cnpj: empresa.cnpj ?? "",
      tipo_negocio: empresa.tipo_negocio ?? "buffet",
      markup_padrao: empresa.markup_padrao,
      margem_alvo: empresa.margem_alvo,
      margem_minima: empresa.margem_minima,
    });
  }, [empresa]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("empresas")
        .update({
          nome: form.nome.trim(),
          cnpj: form.cnpj.trim() || null,
          tipo_negocio: form.tipo_negocio,
          markup_padrao: Number(form.markup_padrao) || 0,
          margem_alvo: Number(form.margem_alvo) || 0,
          margem_minima: Number(form.margem_minima) || 0,
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
    if (!form.nome.trim()) return toast.error("Informe o nome da empresa.");
    if (form.margem_minima > form.margem_alvo) return toast.error("A margem mínima não pode ser maior que a margem alvo.");
    save.mutate();
  };

  if (!empresa) return null;

  return (
    <>
      <PageHeader title="Configurações" description="Dados da empresa e parâmetros usados nos cálculos de cardápio" />

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
            <h2 className="mb-1 text-sm font-medium">Cardápio e margem</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              O markup define o preço de venda por convidado a partir do custo da ficha técnica. As margens definem a cor do selo (verde/amarelo/vermelho) na tela de cardápio.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cfg-markup">Markup padrão (%)</Label>
                <Input id="cfg-markup" type="number" min={0} step="1" value={form.markup_padrao} onChange={(e) => setForm({ ...form, markup_padrao: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cfg-alvo">Margem alvo (%)</Label>
                <Input id="cfg-alvo" type="number" min={0} max={100} step="1" value={form.margem_alvo} onChange={(e) => setForm({ ...form, margem_alvo: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cfg-minima">Margem mínima (%)</Label>
                <Input id="cfg-minima" type="number" min={0} max={100} step="1" value={form.margem_minima} onChange={(e) => setForm({ ...form, margem_minima: Number(e.target.value) })} />
              </div>
            </div>
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
