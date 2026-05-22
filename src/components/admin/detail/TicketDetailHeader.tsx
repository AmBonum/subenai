import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, MoreVertical, ExternalLink, Link2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import type { AdminSupportTicketDetailRow } from "@/lib/admin/queries-tickets";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

import {
  STATUS_LABEL_SK,
  CATEGORY_LABEL_SK,
  STATUS_BADGE_CLASS,
  FSM_TRANSITIONS,
  type TicketStatus,
} from "./ticket-labels";

interface TicketDetailHeaderProps {
  ticket: AdminSupportTicketDetailRow;
  onPrimaryAction?: () => void;
}

// The header surfaces the most-used FSM transition as a primary CTA
// (resolve when something can be resolved, otherwise "Začať riešiť" or
// the next valid step). Everything else lives in the actions sidebar.
function pickPrimaryAction(status: TicketStatus) {
  const transitions = FSM_TRANSITIONS[status] ?? [];
  return transitions.find((t) => t.severity === "success") ?? transitions[0] ?? null;
}

export function TicketDetailHeader({ ticket, onPrimaryAction }: TicketDetailHeaderProps) {
  const qc = useQueryClient();
  const [spamOpen, setSpamOpen] = useState(false);
  const status = ticket.status as TicketStatus;
  const primary = pickPrimaryAction(status);
  const statusClass = STATUS_BADGE_CLASS[status] ?? "";

  async function handleSoftDelete() {
    const { error } = await supabase
      .from("support_tickets")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", ticket.id);
    if (error) {
      toast.error(`Nepodarilo sa označiť ako spam: ${error.message}`);
      return;
    }
    toast.success("Žiadosť bola označená ako spam.");
    qc.invalidateQueries({ queryKey: ["admin", "support_tickets"] });
    qc.invalidateQueries({ queryKey: ["admin", "support_ticket", ticket.id] });
  }

  async function copyAdminLink() {
    const url = `${window.location.origin}/admin/tickets/${ticket.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Odkaz bol skopírovaný do schránky.");
    } catch {
      toast.error("Schránku nebolo možné otvoriť.");
    }
  }

  return (
    <div
      className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"
      data-testid="admin-ticket-detail-header"
    >
      <div className="min-w-0 flex-1">
        <Button asChild variant="ghost" size="sm" data-testid="admin-ticket-detail-back">
          <Link to="/admin/tickets">
            <ArrowLeft className="mr-1 size-4" aria-hidden="true" /> Späť na zoznam
          </Link>
        </Button>
        <h1
          className="mt-2 break-words text-2xl font-bold tracking-tight text-foreground"
          data-testid="admin-ticket-detail-subject"
        >
          {ticket.subject}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <Badge
            variant="outline"
            className={statusClass}
            data-testid="admin-ticket-detail-status-badge"
          >
            {STATUS_LABEL_SK[status] ?? status}
          </Badge>
          <Badge
            variant="outline"
            className="text-xs"
            data-testid="admin-ticket-detail-category-badge"
          >
            {CATEGORY_LABEL_SK[ticket.category] ?? ticket.category}
          </Badge>
          <span
            className="text-xs text-muted-foreground"
            data-testid="admin-ticket-detail-submitter"
          >
            {ticket.submitter_name ? `${ticket.submitter_name} · ` : ""}
            {ticket.submitter_email}
          </span>
        </div>
      </div>

      <div
        className="flex shrink-0 items-center gap-2"
        data-testid="admin-ticket-detail-header-actions"
      >
        {primary && onPrimaryAction && (
          <Button
            size="sm"
            onClick={onPrimaryAction}
            data-testid="admin-ticket-detail-header-primary"
            className={
              primary.severity === "success"
                ? "bg-emerald-600 text-emerald-50 hover:bg-emerald-600/90"
                : undefined
            }
          >
            {primary.label}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              aria-label="Ďalšie akcie"
              data-testid="admin-ticket-detail-kebab-trigger"
            >
              <MoreVertical className="size-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" data-testid="admin-ticket-detail-kebab-menu">
            <DropdownMenuItem
              onSelect={() => {
                window.open(`/contact-form/ticket/${ticket.id}`, "_blank", "noopener,noreferrer");
              }}
              data-testid="admin-ticket-detail-kebab-open-anon"
            >
              <ExternalLink className="mr-2 size-4" aria-hidden="true" />
              Otvoriť thread ako anon
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={copyAdminLink}
              data-testid="admin-ticket-detail-kebab-copy-link"
            >
              <Link2 className="mr-2 size-4" aria-hidden="true" />
              Kopírovať odkaz
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setSpamOpen(true)}
              className="text-destructive focus:text-destructive"
              data-testid="admin-ticket-detail-kebab-spam"
            >
              <Trash2 className="mr-2 size-4" aria-hidden="true" />
              Označiť ako spam
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ConfirmDialog
        open={spamOpen}
        onOpenChange={setSpamOpen}
        title="Označiť žiadosť ako spam?"
        description="Žiadosť bude skrytá z fronty a označená ako zmazaná. Operácia je nezvratná z UI — obnova je možná len cez databázu."
        severity="destructive"
        confirmLabel="Označiť ako spam"
        cancelLabel="Zrušiť"
        typedConfirm={{
          expected: ticket.id,
          label: `Pre potvrdenie zadajte ID žiadosti: ${ticket.id}`,
        }}
        onConfirm={handleSoftDelete}
      />
    </div>
  );
}
