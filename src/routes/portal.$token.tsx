import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileDown, MapPin, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIA_ITEM_CARDAPIO, EVENTO_STATUS, formatCurrency, formatDate, formatHora } from "@/lib/format";
import { Logo } from "@/components/app/Logo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/portal/$token")({
  ssr: false,
  head: () => ({ meta: [{ title: "Seu evento" }] }),
  component: PortalPage,
});

function PortalPage() {
  const { token } = Route.useParams();

  const { data: evento, isLoading, isError } = useQuery({
    queryKey: ["portal-evento", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("portal_evento", { _token: token });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const { data: cardapio = [] } = useQuery({
    queryKey: ["portal-cardapio", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("portal_evento_cardapio", { _token: token });
      if (error) throw error;
      return data;
    },
    enabled: !!evento,
  });

  const { data: parcelas = [] } = useQuery({
    queryKey: ["portal-parcelas", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("portal_parcelas", { _token: token });
      if (error) throw error;
      return data;
    },
    enabled: !!evento,
  });

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Carregando…</div>;
  }

  if (isError || !evento) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="surface-card max-w-sm p-8 text-center">
          <p className="font-medium">Link não encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground">Confira se o link está completo e correto.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 py-10 md:p-10">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between print:hidden">
          <p className="text-sm text-muted-foreground">{evento.empresa_nome}</p>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <FileDown /> Baixar PDF
          </Button>
        </div>

        <div className="surface-card p-6">
          <p className="text-sm text-muted-foreground">{evento.empresa_nome}</p>
          <h1 className="mt-1 text-2xl font-medium font-display">{evento.titulo}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Status: {EVENTO_STATUS[evento.status]}</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span>{formatDate(evento.data, "EEEE, d 'de' MMMM")}</span>
            <span>{formatHora(evento.hora_inicio)}–{formatHora(evento.hora_fim)}</span>
            {evento.local && (
              <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {evento.local}</span>
            )}
            <span className="flex items-center gap-1"><Users className="size-3.5" /> {evento.convidados_estimados} convidados</span>
          </div>
        </div>

        <div className="surface-card p-6">
          <h2 className="mb-4 text-lg font-medium">Cardápio</h2>
          {cardapio.length === 0 ? (
            <p className="text-sm text-muted-foreground">O cardápio ainda não foi definido.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {cardapio.map((item, idx) => (
                <li key={idx} className="flex justify-between border-b pb-1.5 last:border-0">
                  <span>{item.nome}</span>
                  <span className="text-muted-foreground">{CATEGORIA_ITEM_CARDAPIO[item.categoria]}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="surface-card p-6">
          <h2 className="mb-4 text-lg font-medium">Pagamentos</h2>
          {parcelas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma parcela lançada ainda.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {parcelas.map((p, idx) => (
                <li key={idx} className="flex items-center justify-between border-b pb-1.5 last:border-0">
                  <div>
                    <p>{p.descricao || "Parcela"}</p>
                    <p className="text-xs text-muted-foreground">Vencimento: {formatDate(p.data_vencimento)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(p.valor)}</p>
                    <p className={p.status === "pago" ? "text-xs text-success" : "text-xs text-muted-foreground"}>
                      {p.status === "pago" ? "Pago" : "Pendente"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-center py-4 print:hidden">
          <Logo size="sm" />
        </div>
      </div>
    </div>
  );
}
