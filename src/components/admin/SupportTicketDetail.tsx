import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  useAdminSupportTicket,
  useAdminSupportTicketMessages,
  useAdminSupportTicketAttachments,
  useTransitionTicketStatus,
} from "@/lib/admin/queries-tickets";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { TicketDetailHeader } from "./detail/TicketDetailHeader";
import { TicketThread } from "./detail/TicketThread";
import { TicketActionsSidebar } from "./detail/TicketActionsSidebar";
import { FSM_TRANSITIONS, STATUS_LABEL_SK, type TicketStatus } from "./detail/ticket-labels";

// E48-v2 PR-DETAIL — thin orchestrator. Reads the ticket / messages /
// attachments queries, hands them to display components, and owns the
// reply composer (it stays here because the auth-token flow and POST
// to /api/support-ticket-reply are tightly coupled to the page-level
// loading state).

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
  const status = ticket.status as TicketStatus;
  const isClosed = status === "archived";

  async function handlePrimaryAction() {
    const transitions = FSM_TRANSITIONS[status] ?? [];
    const primary = transitions.find((t) => t.severity === "success") ?? transitions[0];
    if (!primary) return;
    try {
      await transition.mutateAsync({ ticketId, newStatus: primary.to });
      toast.success(`Stav prepnutý: ${STATUS_LABEL_SK[primary.to] ?? primary.to}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Prechod stavu zlyhal.");
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

  return (
    <div className="space-y-6" data-testid="admin-ticket-detail-root">
      <TicketDetailHeader ticket={ticket} onPrimaryAction={handlePrimaryAction} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <TicketThread ticket={ticket} messages={messages} attachments={attachments} />

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
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Odoslaním sa stav žiadosti zmení na <strong>Čaká na používateľa</strong> a
                  používateľ dostane e-mail s vašou odpoveďou.
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

        <TicketActionsSidebar ticket={ticket} />
      </div>
    </div>
  );
}
