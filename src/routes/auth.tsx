import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CalendarDays, ChefHat, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Logo } from "@/components/app/Logo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Festeja" },
      { name: "description", content: "Acesse ou cadastre sua empresa de eventos no Festeja." },
      { property: "og:title", content: "Entrar — Festeja" },
      { property: "og:description", content: "Acesse ou cadastre sua empresa de eventos no Festeja." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({ tab: s.tab === "cadastro" ? "cadastro" : "login" }) as { tab: "login" | "cadastro" },
  component: AuthPage,
});

function AuthPage() {
  const { user, perfil, loading } = useAuth();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;
    void navigate({ to: perfil ? "/app" : "/onboarding", replace: true });
  }, [user, perfil, loading, navigate]);

  return (
    <div className="auth-backdrop grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Lado esquerdo — apresentação */}
      <aside className="hidden flex-col justify-between p-12 lg:flex">
        <Logo />
        <div className="max-w-md space-y-8">
          <h1 className="text-5xl leading-[1.05] font-medium text-foreground">
            Sua empresa de eventos, <em className="text-primary">fora das planilhas</em>.
          </h1>
          <p className="text-lg text-muted-foreground">
            Clientes, agenda, cardápio, orçamentos e financeiro em um só lugar — feito para quem não tem tempo a perder.
          </p>
          <ul className="space-y-3 text-sm">
            {[
              { icon: Users, t: "CRM simples com histórico de cada cliente" },
              { icon: CalendarDays, t: "Agenda com bloqueio automático de overbooking" },
              { icon: ChefHat, t: "Orçamento calculado a partir da ficha técnica" },
            ].map(({ icon: Icon, t }) => (
              <li key={t} className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="size-4" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Festeja</p>
      </aside>

      {/* Lado direito — formulário */}
      <main className="flex items-center justify-center p-6">
        <div className="animate-fade-up w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <Tabs value={tab} onValueChange={(v) => navigate({ to: "/auth", search: { tab: v as "login" | "cadastro" } })}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="cadastro">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="surface-card mt-4 p-6">
              <LoginForm />
            </TabsContent>
            <TabsContent value="cadastro" className="surface-card mt-4 p-6">
              <CadastroForm />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setBusy(false);
    if (error) {
      toast.error(
        error.message.includes("Invalid login") ? "E-mail ou senha incorretos." :
        error.message.includes("Email not confirmed") ? "Confirme seu e-mail antes de entrar." : error.message,
      );
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h2 className="text-2xl font-medium">Bem-vindo de volta</h2>
        <p className="text-sm text-muted-foreground">Entre para acessar o painel da sua empresa.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="senha">Senha</Label>
          <Link to="/recuperar-senha" className="text-xs text-primary hover:underline">Esqueci a senha</Link>
        </div>
        <Input id="senha" type="password" required autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</Button>
    </form>
  );
}

function CadastroForm() {
  const [form, setForm] = useState({ nome: "", empresa: "", cnpj: "", email: "", senha: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.senha.length < 6) return toast.error("A senha precisa ter pelo menos 6 caracteres.");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.senha,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        // Guardado no usuário para pré-preencher o onboarding (criação do tenant)
        data: { nome: form.nome, empresa_nome: form.empresa, cnpj: form.cnpj },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("already registered") ? "Este e-mail já está cadastrado." : error.message);
      return;
    }
    // Se a confirmação de e-mail estiver desativada, já existe sessão e o redirect acontece sozinho.
    if (!data.session) setDone(true);
  };

  if (done) {
    return (
      <div className="space-y-3 text-center">
        <h2 className="text-2xl font-medium">Confira seu e-mail</h2>
        <p className="text-sm text-muted-foreground">
          Enviamos um link de confirmação para <strong>{form.email}</strong>. Depois de confirmar, você conclui o cadastro da empresa.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h2 className="text-2xl font-medium">Cadastre sua empresa</h2>
        <p className="text-sm text-muted-foreground">Leva menos de um minuto.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="nome">Seu nome</Label>
        <Input id="nome" required value={form.nome} onChange={set("nome")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
        <div className="space-y-2">
          <Label htmlFor="empresa">Nome da empresa</Label>
          <Input id="empresa" required value={form.empresa} onChange={set("empresa")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ <span className="text-muted-foreground">(opcional)</span></Label>
          <Input id="cnpj" value={form.cnpj} onChange={set("cnpj")} placeholder="00.000.000/0001-00" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email2">E-mail</Label>
        <Input id="email2" type="email" required autoComplete="email" value={form.email} onChange={set("email")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="senha2">Senha</Label>
        <Input id="senha2" type="password" required minLength={6} autoComplete="new-password" value={form.senha} onChange={set("senha")} />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>{busy ? "Criando…" : "Criar conta"}</Button>
    </form>
  );
}
