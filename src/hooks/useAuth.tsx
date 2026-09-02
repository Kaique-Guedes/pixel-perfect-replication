import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Perfil = Tables<"perfis">;
type Empresa = Tables<"empresas">;

interface AuthState {
  session: Session | null;
  user: User | null;
  perfil: Perfil | null;
  empresa: Empresa | null;
  isAdmin: boolean;
  /** true enquanto sessão OU perfil ainda estão carregando */
  loading: boolean;
  refreshPerfil: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [perfilLoading, setPerfilLoading] = useState(false);

  const loadPerfil = useCallback(async (userId: string) => {
    setPerfilLoading(true);
    const [{ data: p }, { data: roles }] = await Promise.all([
      supabase.from("perfis").select("*, empresas(*)").eq("id", userId).maybeSingle(),
      supabase.from("usuarios_papeis").select("role").eq("user_id", userId),
    ]);
    if (p) {
      const { empresas, ...rest } = p as Perfil & { empresas: Empresa | null };
      setPerfil(rest);
      setEmpresa(empresas ?? null);
    } else {
      setPerfil(null);
      setEmpresa(null);
    }
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    setPerfilLoading(false);
  }, []);

  useEffect(() => {
    // Listener primeiro, depois getSession (evita perder eventos)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setSessionLoaded(true);
      if (s?.user) {
        // setTimeout evita deadlock com chamadas ao banco dentro do callback
        setTimeout(() => void loadPerfil(s.user.id), 0);
      } else {
        setPerfil(null);
        setEmpresa(null);
        setIsAdmin(false);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
      if (data.session?.user) void loadPerfil(data.session.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadPerfil]);

  const refreshPerfil = useCallback(async () => {
    if (session?.user) await loadPerfil(session.user.id);
  }, [session, loadPerfil]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    perfil,
    empresa,
    isAdmin,
    loading: !sessionLoaded || (!!session?.user && perfilLoading && !perfil),
    refreshPerfil,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
