import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Enums } from "@/integrations/supabase/types";
import { TIPO_NEGOCIO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/app/Logo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Configurar empresa — Festeja" }] }),
  component: Onboarding,
});

function Onboarding() {
  const { user, perfil, loading, refreshPerfil, signOut } = useAuth();
  const navigate = useNavigate();
  const meta = (user?.user_metadata ?? {}) as Record<string, string | undefined>;
  const [form, setForm] = useState({ nome: "", empresa: "", cnpj: "" });
  const [tipo, setTipo] = useState<Enums<"tipo_negocio">>("buffet");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm({ nome: meta["nome"] ?? "", empresa: meta["empresa_nome"] ?? "", cnpj: meta["cnpj"] ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!loading && perfil) void navigate({ to: "/app", replace: true });
  }, [loading, perfil, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("criar_empresa", {
      _nome_empresa: form.empresa.trim(),
      _cnpj: form.cnpj.trim(),
      _tipo: tipo,
      _nome_usuario: form.nome.trim(),
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    await refreshPerfil();
    toast.success("Empresa criada! Bem-vindo ao Festeja.");
    void navigate({ to: "/app", replace: true });
  };

  return (
    <div className="auth-backdrop flex min-h-screen items-center justify-center p-6">
      <div className="animate-fade-up w-full max-w-lg">
        <Logo className="mb-8" />
        <form onSubmit={onSubmit} className="surface-card space-y-6 p-8">
          <div>
            <h1 className="text-3xl font-medium">Vamos configurar sua empresa</h1>
            <p className="mt-1 text-sm text-muted-foreground">Você poderá ajustar tudo isso depois em Configurações.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nome">Seu nome</Label>
            <Input id="nome" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <div className="space-y-2">
              <Label htmlFor="empresa">Nome da empresa</Label>
              <Input id="empresa" required value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ <span className="text-muted-foreground">(opcional)</span></Label>
              <Input id="cnpj" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de negócio</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TIPO_NEGOCIO) as Enums<"tipo_negocio">[]).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTipo(t)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                    tipo === t ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-accent",
                  )}
                >
                  {TIPO_NEGOCIO[t]}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Criando…" : "Concluir cadastro"}</Button>
          <button type="button" onClick={() => void signOut()} className="w-full text-center text-xs text-muted-foreground hover:underline">
            Sair e usar outra conta
          </button>
        </form>
      </div>
    </div>
  );
}
