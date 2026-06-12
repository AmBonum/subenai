import { createLazyFileRoute, useParams, useSearch, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createLazyFileRoute("/contact-form/ticket/$id")({
  component: KontaktTicketViewPage,
});

// E48 — Anonymous read-only thread view. The submitter clicks the link
// from the confirmation/reply e-mail (`/contact-form/ticket/{id}?token=<64-hex>`)
// and lands here. The page calls `get_ticket_thread_for_view_token`
// (SECURITY DEFINER) which validates the token hash + expiry + revocation
// and returns the ticket + messages + attachment metadata WITHOUT exposing
// `view_token_hash`, `view_token_expires_at`, or `view_token_invalidated_at`.
// RLS denies any direct table read for anon; only the RPC is allowed.

const STATUS_LABEL_SK: Record<string, string> = {
  new: "Nové",
  in_progress: "V riešení",
  waiting_user: "Čaká na teba",
  resolved: "Vyriešené",
  reopened: "Znovu otvorené",
  archived: "Archivované",
};

const CATEGORY_LABEL_SK: Record<string, string> = {
  bug: "Chyba",
  question: "Otázka",
  feature_request: "Návrh",
  abuse_report: "Nevhodný obsah",
  billing: "Platby",
  gdpr: "GDPR",
  other: "Iné",
};

interface ThreadTicket {
  id: string;
  subject: string;
  body: string;
  category: string;
  status: string;
  created_at: string;
  submitter_email: string;
  submitter_name: string | null;
}

interface ThreadMessage {
  id: string;
  created_at: string;
  author_kind: "user" | "admin" | "system";
  author_name: string;
  body: string;
}

interface ThreadAttachment {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  scan_status: string;
}

interface ThreadPayload {
  ticket: ThreadTicket;
  messages: ThreadMessage[];
  attachments: ThreadAttachment[];
}

function KontaktTicketViewPage() {
  const { id } = useParams({ from: "/contact-form/ticket/$id" });
  const { token } = useSearch({ from: "/contact-form/ticket/$id" });

  const threadQ = useQuery({
    queryKey: ["kontakt", "ticket-view", id, token],
    queryFn: async (): Promise<ThreadPayload | null> => {
      if (!token) return null;
      const { data, error } = await supabase.rpc("get_ticket_thread_for_view_token", {
        p_ticket_id: id,
        p_view_token: token,
        p_ip_country: null,
      });
      if (error) throw error;
      if (!data) return null;
      return data as unknown as ThreadPayload;
    },
    enabled: Boolean(id && token),
    retry: false,
  });

  if (!token) {
    return (
      <ViewShell>
        <NotFoundCard
          title="Chýba bezpečnostný token"
          body="Pre zobrazenie žiadosti otvor odkaz z e-mailu, ktorý sme ti poslali. Token je súčasťou URL adresy."
        />
      </ViewShell>
    );
  }

  if (threadQ.isLoading) {
    return (
      <ViewShell>
        <div
          className="flex items-center gap-2 text-sm text-muted-foreground"
          data-testid="kontakt-ticket-view-loading"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Načítavam vlákno…
        </div>
      </ViewShell>
    );
  }

  if (threadQ.isError || !threadQ.data) {
    return (
      <ViewShell>
        <NotFoundCard
          title="Odkaz už nie je platný"
          body="Token mohol vypršať (platnosť 90 dní), bol odvolaný, alebo bola žiadosť odstránená. Ak potrebuješ pomôcť, napíš nám prosím novú žiadosť."
        />
      </ViewShell>
    );
  }

  const { ticket, messages, attachments } = threadQ.data;

  return (
    <ViewShell>
      <header className="space-y-3 pb-6" data-testid="kontakt-ticket-view-header">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="kontakt-ticket-view-subject">
          {ticket.subject}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline" data-testid="kontakt-ticket-view-status">
            {STATUS_LABEL_SK[ticket.status] ?? ticket.status}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {CATEGORY_LABEL_SK[ticket.category] ?? ticket.category}
          </Badge>
          <span className="text-xs text-muted-foreground">
            Odoslané {new Date(ticket.created_at).toLocaleString("sk-SK")}
          </span>
        </div>
      </header>

      <section
        className="space-y-3 rounded-md border border-border bg-card p-4"
        data-testid="kontakt-ticket-view-thread"
      >
        <article className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {ticket.submitter_name ?? ticket.submitter_email}
            <span className="ml-2 text-muted-foreground/60">
              {new Date(ticket.created_at).toLocaleString("sk-SK")}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-sm">{ticket.body}</p>
        </article>

        {messages.map((m) => (
          <article
            key={m.id}
            className={
              m.author_kind === "admin"
                ? "rounded-md border-l-2 border-emerald-500 bg-emerald-50/60 p-3 dark:bg-emerald-950/30"
                : "ml-8 rounded-md border-l-2 border-muted p-3"
            }
            data-testid={`kontakt-ticket-view-message-${m.id}`}
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {m.author_name}
              <span className="ml-2 text-muted-foreground/60">
                {new Date(m.created_at).toLocaleString("sk-SK")}
              </span>
              <Badge variant="outline" className="ml-2 text-[10px]">
                {m.author_kind === "admin"
                  ? "tím podpory"
                  : m.author_kind === "system"
                    ? "systém"
                    : "ty"}
              </Badge>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p>
          </article>
        ))}
      </section>

      {attachments.length > 0 && (
        <section
          className="rounded-md border border-border bg-card p-4"
          data-testid="kontakt-ticket-view-attachments"
        >
          <h2 className="text-sm font-semibold text-foreground">Prílohy</h2>
          <ul className="mt-2 space-y-1" data-testid="kontakt-ticket-view-attachment-list">
            {attachments.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 text-xs"
                data-testid={`kontakt-ticket-view-attachment-${a.id}`}
              >
                <Badge
                  variant="outline"
                  className="text-[10px]"
                  data-testid={`kontakt-ticket-view-attachment-scan-${a.id}`}
                >
                  {a.scan_status === "clean" ? "✓ overené" : "⚠ chyba"}
                </Badge>
                <span className="text-foreground">{a.filename}</span>
                <span className="text-muted-foreground">
                  ({Math.round(a.size_bytes / 1024)} kB)
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer
        className="flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground"
        data-testid="kontakt-ticket-view-footer"
      >
        <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
        <p>
          Toto je zobrazenie len na čítanie, viazané na bezpečnostný token z e-mailu. Nájdeš tu
          oficiálny stav žiadosti a odpovede tímu podpory. Ak chceš niečo doplniť, odpovedz priamo
          na e-mail od podpory — dostane sa k reálnemu človeku, ktorý žiadosť rieši.
        </p>
      </footer>
    </ViewShell>
  );
}

function ViewShell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="mx-auto w-full max-w-2xl space-y-6 px-4 py-12 sm:py-16"
      data-testid="kontakt-ticket-view-root"
    >
      <Button asChild variant="ghost" size="sm" data-testid="kontakt-ticket-view-back">
        <Link to="/contact-form">
          <ArrowLeft className="mr-1 size-4" aria-hidden="true" /> Späť na kontakt
        </Link>
      </Button>
      {children}
    </main>
  );
}

function NotFoundCard({ title, body }: { title: string; body: string }) {
  return (
    <section
      className="space-y-2 rounded-md border border-amber-500/40 bg-amber-50/60 p-5 dark:bg-amber-950/30"
      data-testid="kontakt-ticket-view-not-found"
    >
      <h1 className="text-lg font-semibold text-amber-900 dark:text-amber-100">{title}</h1>
      <p className="text-sm text-amber-900/80 dark:text-amber-100/80">{body}</p>
      <Button asChild variant="outline" size="sm" className="mt-2">
        <Link to="/contact-form">Otvoriť kontaktný formulár</Link>
      </Button>
    </section>
  );
}
