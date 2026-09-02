import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/app/Logo";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Festeja" },
      { name: "description", content: "Defina uma nova senha para sua conta." },
      { property: "og:title", content: "Redefinir senha — Festeja" },
      { property: "og:description", content: "Defina uma nova senha para sua conta." },
    ],
  }),
  component: RedefinirSenha,
});

function RedefinirSenha() {
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (senha.length < 6) return toast.error("A senha precisa ter pelo menos 6 caracteres.");
    if (senha !== confirma) return toast.error("As senhas não conferem.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada!");
    void navigate({ to: "/", replace: true });
  };

  return (
    <div className="auth-backdrop flex min-h-screen items-center justify-center p-6">
      <div className="animate-fade-up w-full max-w-md space-y-6">
        <Logo />
        <form onSubmit={onSubmit} className="surface-card space-y-5 p-6">
          <div>
            <h1 className="text-2xl font-medium">Nova senha</h1>
            <p className="text-sm text-muted-foreground">Escolha uma senha com pelo menos 6 caracteres.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="senha">Nova senha</Label>
            <Input id="senha" type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirma">Confirmar senha</Label>
            <Input id="confirma" type="password" required value={confirma} onChange={(e) => setConfirma(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Salvando…" : "Salvar nova senha"}</Button>
        </form>
      </div>
    </div>
  );
}
