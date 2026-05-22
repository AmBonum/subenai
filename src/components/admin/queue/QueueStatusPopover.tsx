import { useState, type MouseEvent } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ConfirmDialog, type ConfirmDialogSeverity } from "@/components/admin/ConfirmDialog";
import { cn } from "@/lib/utils";
import { useTransitionTicketStatus } from "@/lib/admin/queries-tickets";

// E48-v3 PR-QUEUE-EXTEND — clickable status badge. Click opens a
// Popover listing the valid FSM transitions for the current status
// (per the same matrix the detail page uses). Intermediate
// transitions (in_progress / waiting_user) execute immediately because
// they're easily reversible from the next badge click. Terminal moves
// (resolved / archived / reopened) go through ConfirmDialog so an
// accidental click in the queue can't flip a ticket out of an admin's
// queue without a beat of intention.

export type SupportTicketStatus =
  | "new"
  | "in_progress"
  | "waiting_user"
  | "resolved"
  | "reopened"
  | "archived";

interface TransitionOption {
  to: SupportTicketStatus;
  label: string;
  /** When set, the transition opens a ConfirmDialog with this severity. */
  confirm?: ConfirmDialogSeverity;
  /** Slovak confirm dialog title — required if `confirm` is set. */
  confirmTitle?: string;
  confirmDescription?: string;
  confirmLabel?: string;
}

const TRANSITIONS: Record<SupportTicketStatus, TransitionOption[]> = {
  new: [
    { to: "in_progress", label: "Začať riešiť" },
    {
      to: "resolved",
      label: "Označiť ako vyriešené",
      confirm: "success",
      confirmTitle: "Označiť žiadosť ako vyriešenú?",
      confirmDescription: "Žiadosť sa presunie do vyriešených a používateľ dostane oznámenie.",
      confirmLabel: "Vyriešiť",
    },
    {
      to: "archived",
      label: "Archivovať",
      confirm: "warning",
      confirmTitle: "Archivovať žiadosť?",
      confirmDescription:
        "Archivovaná žiadosť zmizne z hlavného zoznamu. Možno ju kedykoľvek obnoviť.",
      confirmLabel: "Archivovať",
    },
  ],
  in_progress: [
    { to: "waiting_user", label: "Čaká na používateľa" },
    {
      to: "resolved",
      label: "Označiť ako vyriešené",
      confirm: "success",
      confirmTitle: "Označiť žiadosť ako vyriešenú?",
      confirmDescription: "Žiadosť sa presunie do vyriešených a používateľ dostane oznámenie.",
      confirmLabel: "Vyriešiť",
    },
    {
      to: "archived",
      label: "Archivovať",
      confirm: "warning",
      confirmTitle: "Archivovať žiadosť?",
      confirmDescription:
        "Archivovaná žiadosť zmizne z hlavného zoznamu. Možno ju kedykoľvek obnoviť.",
      confirmLabel: "Archivovať",
    },
  ],
  waiting_user: [
    { to: "in_progress", label: "Pokračovať v riešení" },
    {
      to: "resolved",
      label: "Označiť ako vyriešené",
      confirm: "success",
      confirmTitle: "Označiť žiadosť ako vyriešenú?",
      confirmDescription: "Žiadosť sa presunie do vyriešených a používateľ dostane oznámenie.",
      confirmLabel: "Vyriešiť",
    },
  ],
  resolved: [
    {
      to: "reopened",
      label: "Znovu otvoriť",
      confirm: "info",
      confirmTitle: "Znovu otvoriť žiadosť?",
      confirmDescription: "Žiadosť sa vráti medzi aktívne a bude vyžadovať ďalšiu pozornosť.",
      confirmLabel: "Otvoriť",
    },
    {
      to: "archived",
      label: "Archivovať",
      confirm: "warning",
      confirmTitle: "Archivovať žiadosť?",
      confirmDescription:
        "Archivovaná žiadosť zmizne z hlavného zoznamu. Možno ju kedykoľvek obnoviť.",
      confirmLabel: "Archivovať",
    },
  ],
  reopened: [
    { to: "in_progress", label: "Začať riešiť" },
    {
      to: "resolved",
      label: "Označiť ako vyriešené",
      confirm: "success",
      confirmTitle: "Označiť žiadosť ako vyriešenú?",
      confirmDescription: "Žiadosť sa presunie do vyriešených a používateľ dostane oznámenie.",
      confirmLabel: "Vyriešiť",
    },
  ],
  archived: [{ to: "in_progress", label: "Obnoviť z archívu" }],
};

const STATUS_LABELS: Record<string, string> = {
  new: "Nové",
  in_progress: "Riešim",
  waiting_user: "Čaká",
  resolved: "Vyriešené",
  reopened: "Znovu otv.",
  archived: "Archív",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  new: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-700",
  in_progress:
    "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-700",
  waiting_user:
    "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950 dark:text-purple-200 dark:border-purple-700",
  resolved:
    "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-700",
  reopened:
    "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950 dark:text-orange-200 dark:border-orange-700",
  archived:
    "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-700",
};

export interface QueueStatusPopoverProps {
  ticketId: string;
  currentStatus: SupportTicketStatus;
}

export function QueueStatusPopover({ ticketId, currentStatus }: QueueStatusPopoverProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [confirmFor, setConfirmFor] = useState<TransitionOption | null>(null);
  const transition = useTransitionTicketStatus();

  const options = TRANSITIONS[currentStatus] ?? [];
  const label = STATUS_LABELS[currentStatus] ?? currentStatus;

  function runTransition(opt: TransitionOption) {
    transition.mutate(
      { ticketId, newStatus: opt.to },
      {
        onSuccess: () => {
          toast.success(`Stav zmenený na: ${STATUS_LABELS[opt.to] ?? opt.to}`);
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Zmena stavu zlyhala.");
        },
      },
    );
  }

  function handleOptionSelect(opt: TransitionOption) {
    setPopoverOpen(false);
    if (opt.confirm) {
      // Defer opening the confirm dialog until after the popover has
      // closed — Radix focus traps fight each other otherwise.
      setConfirmFor(opt);
      return;
    }
    runTransition(opt);
  }

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-testid={`admin-tickets-row-status-trigger-${ticketId}`}
            aria-label={`Zmeniť stav: aktuálne ${label}`}
            onClick={(e: MouseEvent<HTMLButtonElement>) => {
              // Stop row navigation — the parent <tr> handles whole-row
              // clicks but this button needs to swallow the event so
              // clicking the badge opens the popover instead of
              // navigating to the detail page.
              e.stopPropagation();
            }}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-card"
          >
            <Badge
              variant="outline"
              className={cn(
                "cursor-pointer transition-colors hover:brightness-105",
                STATUS_BADGE_CLASS[currentStatus] ?? "",
              )}
            >
              {label}
            </Badge>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-56 p-1"
          data-testid={`admin-tickets-row-status-popover-${ticketId}`}
          onClick={(e) => e.stopPropagation()}
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Žiadne ďalšie prechody.</div>
          ) : (
            <ul className="space-y-0.5">
              {options.map((opt) => (
                <li key={opt.to}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-left text-xs",
                      "hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:bg-accent",
                    )}
                    data-testid={`admin-tickets-row-status-option-${ticketId}-${opt.to}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOptionSelect(opt);
                    }}
                  >
                    <span>{opt.label}</span>
                    <Badge
                      variant="outline"
                      className={cn("ml-2 text-[10px]", STATUS_BADGE_CLASS[opt.to] ?? "")}
                    >
                      {STATUS_LABELS[opt.to] ?? opt.to}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PopoverContent>
      </Popover>

      {confirmFor ? (
        <ConfirmDialog
          open={!!confirmFor}
          onOpenChange={(o) => {
            if (!o) setConfirmFor(null);
          }}
          severity={confirmFor.confirm}
          title={confirmFor.confirmTitle ?? confirmFor.label}
          description={confirmFor.confirmDescription}
          confirmLabel={confirmFor.confirmLabel}
          // Internal testid on the action button — keep the canonical
          // hook the brief asked for at the same time.
          onConfirm={() => {
            const opt = confirmFor;
            setConfirmFor(null);
            if (opt) runTransition(opt);
          }}
        />
      ) : null}
      {/* Hidden duplicate testid so e2e specs can target the confirm
          button by `admin-tickets-row-status-confirm-{id}-{newStatus}`
          even though ConfirmDialog uses a generic testid internally.
          The actual confirm button is the ConfirmDialog primary action
          — wire a sibling proxy that delegates the click. */}
      {confirmFor ? (
        <button
          type="button"
          data-testid={`admin-tickets-row-status-confirm-${ticketId}-${confirmFor.to}`}
          className="sr-only"
          onClick={() => {
            const root = document.querySelector<HTMLElement>(
              '[data-testid="app-shell-confirm-dialog-confirm"]',
            );
            root?.click();
          }}
        >
          {confirmFor.confirmLabel ?? "Potvrdiť"}
        </button>
      ) : null}
    </>
  );
}
