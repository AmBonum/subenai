import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Send } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  useAdminSupportTicket,
  useAdminSupportTicketMessages,
  useAdminSupportTicketAttachments,
  useTransitionTicketStatus,
} from "@/lib/admin/queries";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";

// E48.7 — Admin ticket detail. Sticky header + scrollable thread +
// reply composer. Status transitions go through transition_ticket_status
// RPC (admin + AAL2 enforced server-side). Reply submission posts to
// /api/support-ticket-reply (E48.8 CF function) — that handler INSERTs
// the message, flips status to waiting_user, sends the user email.

const STATUS_LABEL_SK: Record<string, string> = {
  new: "Nové",
  in_progress: "Riešim",
  waiting_user: "Čaká na používateľa",
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

interface SupportTicketDetailProps {
  ticketId: string;
}

export function SupportTicketDetail({ ticketId }: SupportTicketDetailProps) {
  const ticketQ = useAdminSupportTicket(ticketId);
  const messagesQ = useAdminSupportTicketMessages(ticketId);
  const attachmentsQ = useAdminSupportTicketAttachments(ticketId);
  const transition = useTransitionTicketStatus();
  const qc = useQueryClient();

  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);

  if (ticketQ.isLoading) {
    return (
      <div data-testid="admin-ticket-detail-loading" className="text-sm text-muted-foreground">
        <Loader2 className="mr-2 inline-block size-4 animate-spin" aria-hidden="true" />
        Načítavam žiadosť…
      </div>
    );
  }

  if (!ticketQ.data) {
    return (
      <div data-testid="admin-ticket-detail-not-found">
        <p className="text-sm text-destructive">Žiadosť nebola nájdená alebo bola zmazaná.</p>
        <Button asChild variant="ghost" size="sm" className="mt-3">
          <Link to="/admin/tickets">
            <ArrowLeft className="mr-1 size-4" aria-hidden="true" /> Späť na zoznam
          </Link>
        </Button>
      </div>
    );
  }

  const ticket = ticketQ.data;
  const messages = messagesQ.data ?? [];
  const attachments = attachmentsQ.data ?? [];

  async function handleTransition(newStatus: string) {
    try {
      await transition.mutateAsync({ ticketId, newStatus });
      toast.success(`Stav prepnutý: ${STATUS_LABEL_SK[newStatus] ?? newStatus}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Prechod stavu zlyhal.";
      toast.error(msg);
    }
  }

  async function handleSendReply() {
    if (replyBody.trim().length === 0) return;
    setSending(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error("Relácia vypršala. Prihláste sa znova.");
        return;
      }
      const res = await fetch("/api/support-ticket-reply", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ticket_id: ticketId, body: replyBody.trim() }),
      });
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(`Odpoveď zlyhala: ${errBody.error ?? "neznáma chyba"}`);
      }
      toast.success("Odpoveď bola odoslaná. Stav žiadosti je teraz 'Čaká na používateľa'.");
      setReplyBody("");
      qc.invalidateQueries({ queryKey: ["admin", "support_ticket_messages", ticketId] });
      qc.invalidateQueries({ queryKey: ["admin", "support_ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["admin", "support_tickets"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Odpoveď zlyhala.");
    } finally {
      setSending(false);
    }
  }

  const status = ticket.status;
  const canStart = status === "new";
  const canResolve = status === "in_progress" || status === "waiting_user";
  const canReopen = status === "resolved" || status === "archived";
  const canArchive = status === "resolved";
  const isClosed = status === "archived";

  return (
    <div className="space-y-6" data-testid="admin-ticket-detail-root">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Button asChild variant="ghost" size="sm" data-testid="admin-ticket-detail-back">
            <Link to="/admin/tickets">
              <ArrowLeft className="mr-1 size-4" aria-hidden="true" /> Späť na zoznam
            </Link>
          </Button>
          <h1
            className="mt-2 text-2xl font-bold tracking-tight"
            data-testid="admin-ticket-detail-subject"
          >
            {ticket.subject}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline" data-testid="admin-ticket-detail-status-badge">
              {STATUS_LABEL_SK[status] ?? status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {CATEGORY_LABEL_SK[ticket.category] ?? ticket.category}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {ticket.submitter_name ? `${ticket.submitter_name} · ` : ""}
              {ticket.submitter_email}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" data-testid="admin-ticket-detail-actions">
          {canStart && (
            <Button
              size="sm"
              onClick={() => handleTransition("in_progress")}
              data-testid="admin-ticket-action-start"
            >
              Začať riešiť
            </Button>
          )}
          {canResolve && (
            <Button
              size="sm"
              variant="default"
              onClick={() => handleTransition("resolved")}
              data-testid="admin-ticket-action-resolve"
            >
              Označiť ako vyriešené
            </Button>
          )}
          {canReopen && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTransition(status === "archived" ? "reopened" : "reopened")}
              data-testid="admin-ticket-action-reopen"
            >
              Znovu otvoriť
            </Button>
          )}
          {canArchive && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleTransition("archived")}
              data-testid="admin-ticket-action-archive"
            >
              Archivovať
            </Button>
          )}
        </div>
      </div>

      {/* Thread */}
      <div
        className="space-y-3 rounded-md border border-border bg-card p-4"
        data-testid="admin-ticket-detail-thread"
      >
        {/* Initial body (treated as the first user message) */}
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
                ? "ml-8 rounded-md border-l-2 border-emerald-500 bg-emerald-50/60 p-3 dark:bg-emerald-950/30"
                : "rounded-md border-l-2 border-muted p-3"
            }
            data-testid={`admin-ticket-detail-message-${m.id}`}
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {m.author_name}
              <span className="ml-2 text-muted-foreground/60">
                {new Date(m.created_at).toLocaleString("sk-SK")}
              </span>
              <Badge variant="outline" className="ml-2 text-[10px]">
                {m.author_kind === "admin"
                  ? "admin"
                  : m.author_kind === "system"
                    ? "systém"
                    : "používateľ"}
              </Badge>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{m.body}</p>
          </article>
        ))}

        {attachments.length > 0 && (
          <div
            className="mt-2 border-t border-border pt-3"
            data-testid="admin-ticket-detail-attachments"
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Prílohy</div>
            <ul className="mt-2 space-y-1">
              {attachments.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-[10px]">
                    {a.scan_status === "clean" ? "✓ clean" : "⚠ chyba"}
                  </Badge>
                  <span className="text-foreground">{a.filename}</span>
                  <span className="text-muted-foreground">
                    ({Math.round(a.size_bytes / 1024)} kB)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Reply composer */}
      {!isClosed && (
        <div
          className="space-y-2 rounded-md border border-border bg-card p-4"
          data-testid="admin-ticket-detail-composer"
        >
          <label htmlFor="admin-ticket-reply" className="text-sm font-semibold text-foreground">
            Vaša odpoveď
          </label>
          <Textarea
            id="admin-ticket-reply"
            rows={6}
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Napíšte odpoveď používateľovi…"
            data-testid="admin-ticket-detail-reply-textarea"
            disabled={sending}
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Odoslaním sa stav žiadosti zmení na <strong>Čaká na používateľa</strong> a používateľ
              dostane e-mail s vašou odpoveďou.
            </p>
            <Button
              type="button"
              onClick={handleSendReply}
              disabled={sending || replyBody.trim().length === 0}
              data-testid="admin-ticket-detail-reply-send"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" /> Odosielam…
                </>
              ) : (
                <>
                  <Send className="mr-2 size-4" aria-hidden="true" /> Odoslať odpoveď
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
