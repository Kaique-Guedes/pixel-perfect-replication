import { createFileRoute, Outlet } from "@tanstack/react-router";

// Rota "pai" de /app/agenda — existe só porque agenda.$eventoId.tsx
// também mora aqui (convenção de arquivos do TanStack Router: um
// arquivo e um arquivo "arquivo.$param.tsx" na mesma pasta viram
// pai/filho automaticamente). Sem esse <Outlet />, a página do evento
// nunca aparecia — a URL mudava, mas quem continuava desenhando a tela
// era este arquivo, que antes tinha o calendário direto aqui dentro
// (isso foi movido para agenda.index.tsx, que é o conteúdo de
// /app/agenda de verdade).
export const Route = createFileRoute("/_authenticated/app/agenda")({
  component: () => <Outlet />,
});
