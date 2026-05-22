import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { MoreVertical, ExternalLink, UserCheck2, CheckCircle2, Archive, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import type { AdminSupportTicketRow } from "@/lib/admin/queries-tickets";
import { useAssignToMe, useTransitionTicketStatus } from "@/lib/admin/queries-tickets";

// E48-v2 PR-D — per-row "..." action menu. Items shown depend on the
// current ticket status (no point offering "mark resolved" on an
// already-resolved row). Destructive / warning actions go through
// ConfirmDialog per CLAUDE.md.

interface Props {
  ticket: AdminSupportTicketRow;
}

export function TicketActionMenu({ ticket }: Props) {
  const navigate = useNavigate();
  const assign = useAssignToMe();
  const transition = useTransitionTicketStatus();
  const [confirmKind, setConfirmKind] = useState<"resolve" | "archive" | null>(null);

  const isResolved = ticket.status === "resolved";
  const isArchived = ticket.status === "archived";
  const canResolve = !isResolved && !isArchived;
  const canArchive = !isArchived;

  async function copyLink() {
    const url = `${window.location.origin}/admin/tickets/${ticket.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Odkaz bol skopírovaný.");
    } catch {
      toast.error("Schránka nie je dostupná.");
    }
  }

  function handleAssignMe() {
    assign.mutate(ticket.id, {
      onSuccess: () => toast.success("Pridelené vám."),
      onError: () => toast.error("Pridelenie zlyhalo."),
    });
  }

  function handleResolve() {
    transition.mutate(
      { ticketId: ticket.id, newStatus: "resolved" },
      {
        onSuccess: () => toast.success("Označené ako vyriešené."),
        onError: () => toast.error("Zmena stavu zlyhala."),
      },
    );
  }

  function handleArchive() {
    transition.mutate(
      { ticketId: ticket.id, newStatus: "archived" },
      {
        onSuccess: () => toast.success("Archivované."),
        onError: () => toast.error("Archivácia zlyhala."),
      },
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={`Akcie pre žiadosť ${ticket.id.slice(0, 8)}`}
            data-testid={`admin-tickets-row-action-menu-${ticket.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onClick={(e) => e.stopPropagation()}
          data-testid={`admin-tickets-row-action-menu-content-${ticket.id}`}
        >
          <DropdownMenuItem
            onSelect={() =>
              navigate({ to: "/admin/tickets/$ticketId", params: { ticketId: ticket.id } })
            }
            data-testid={`admin-tickets-row-action-open-${ticket.id}`}
          >
            <ExternalLink className="mr-2 size-4" aria-hidden="true" /> Otvoriť
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={handleAssignMe}
            data-testid={`admin-tickets-row-action-assign-${ticket.id}`}
          >
            <UserCheck2 className="mr-2 size-4" aria-hidden="true" /> Prideliť mne
          </DropdownMenuItem>
          {canResolve ? (
            <DropdownMenuItem
              onSelect={() => setConfirmKind("resolve")}
              data-testid={`admin-tickets-row-action-resolve-${ticket.id}`}
            >
              <CheckCircle2 className="mr-2 size-4" aria-hidden="true" /> Označiť ako vyriešené
            </DropdownMenuItem>
          ) : null}
          {canArchive ? (
            <DropdownMenuItem
              onSelect={() => setConfirmKind("archive")}
              data-testid={`admin-tickets-row-action-archive-${ticket.id}`}
            >
              <Archive className="mr-2 size-4" aria-hidden="true" /> Archivovať
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={copyLink}
            data-testid={`admin-tickets-row-action-copy-${ticket.id}`}
          >
            <Link2 className="mr-2 size-4" aria-hidden="true" /> Skopírovať odkaz
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={confirmKind === "resolve"}
        onOpenChange={(o) => {
          if (!o) setConfirmKind(null);
        }}
        severity="success"
        title="Označiť ako vyriešené?"
        description="Žiadosť sa presunie medzi vyriešené. Stav je možné neskôr zmeniť späť."
        confirmLabel="Vyriešiť"
        onConfirm={handleResolve}
      />
      <ConfirmDialog
        open={confirmKind === "archive"}
        onOpenChange={(o) => {
          if (!o) setConfirmKind(null);
        }}
        severity="warning"
        title="Archivovať žiadosť?"
        description="Žiadosť sa skryje z hlavného zoznamu. Možno ju vrátiť späť cez filter Archivované."
        confirmLabel="Archivovať"
        onConfirm={handleArchive}
      />
    </>
  );
}
