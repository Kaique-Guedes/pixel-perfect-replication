import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/app/Logo";

export const Route = createFileRoute("/recuperar-senha")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — Festeja" },
      { name: "description", content: "Receba um link para redefinir sua senha." },
      { property: "og:title", content: "Recuperar senha — Festeja" },
      { property: "og:description", content: "Receba um link para redefinir sua senha." },
    ],
  }),
  component: RecuperarSenha,
});

function RecuperarSenha() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSent(true);
  };

  return (
    <div className="auth-backdrop flex min-h-screen items-center justify-center p-6">
      <div className="animate-fade-up w-full max-w-md space-y-6">
        <Logo />
        <form onSubmit={onSubmit} className="surface-card space-y-5 p-6">
          <div>
            <h1 className="text-2xl font-medium">Recuperar senha</h1>
            <p className="text-sm text-muted-foreground">Informe seu e-mail e enviaremos um link para redefinir.</p>
          </div>
          {sent ? (
            <p className="rounded-lg bg-success/10 p-3 text-sm text-success">Se existir uma conta para {email}, você receberá o link em instantes.</p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Enviando…" : "Enviar link"}</Button>
            </>
          )}
          <Link to="/auth" search={{ tab: "login" }} className="block text-center text-sm text-primary hover:underline">Voltar para o login</Link>
        </form>
      </div>
    </div>
  );
}
