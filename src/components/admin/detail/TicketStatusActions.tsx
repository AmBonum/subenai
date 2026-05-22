import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useTransitionTicketStatus } from "@/lib/admin/queries-tickets";

import {
  STATUS_LABEL_SK,
  FSM_TRANSITIONS,
  type TicketStatus,
  type StatusTransition,
} from "./ticket-labels";

interface TicketStatusActionsProps {
  ticketId: string;
  status: TicketStatus;
}

const SEVERITY_BUTTON_CLASS: Record<StatusTransition["severity"], string> = {
  default: "",
  success: "bg-emerald-600 text-emerald-50 hover:bg-emerald-600/90",
  warning: "bg-amber-500 text-amber-50 hover:bg-amber-500/90",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
};

const SEVERITY_TO_DIALOG_SEVERITY: Record<
  StatusTransition["severity"],
  "info" | "success" | "warning" | "destructive"
> = {
  default: "info",
  success: "success",
  warning: "warning",
  destructive: "destructive",
};

export function TicketStatusActions({ ticketId, status }: TicketStatusActionsProps) {
  const transition = useTransitionTicketStatus();
  const [pending, setPending] = useState<StatusTransition | null>(null);
  const transitions = FSM_TRANSITIONS[status] ?? [];

  async function runTransition(t: StatusTransition) {
    try {
      await transition.mutateAsync({ ticketId, newStatus: t.to });
      toast.success(`Stav prepnutý: ${STATUS_LABEL_SK[t.to] ?? t.to}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Prechod stavu zlyhal.";
      toast.error(msg);
    }
  }

  return (
    <section
      className="rounded-md border border-border bg-card p-4"
      data-testid="admin-ticket-status-actions"
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Stav žiadosti
      </h2>
      <p className="mt-1 text-sm text-foreground">{STATUS_LABEL_SK[status] ?? status}</p>

      <div className="mt-3 flex flex-col gap-2" data-testid="admin-ticket-status-actions-buttons">
        {transitions.length === 0 && (
          <p
            className="text-xs text-muted-foreground"
            data-testid="admin-ticket-status-no-transitions"
          >
            Žiadne prechody nie sú dostupné.
          </p>
        )}
        {transitions.map((t) => (
          <Button
            key={t.to}
            type="button"
            size="sm"
            variant={t.severity === "default" ? "outline" : "default"}
            className={SEVERITY_BUTTON_CLASS[t.severity] || undefined}
            disabled={transition.isPending}
            onClick={() => {
              if (t.needsConfirm) setPending(t);
              else runTransition(t);
            }}
            data-testid={`admin-ticket-status-action-${t.to}`}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={pending ? `${pending.label}?` : ""}
        description={
          pending
            ? `Stav žiadosti sa zmení na „${STATUS_LABEL_SK[pending.to] ?? pending.to}".`
            : undefined
        }
        severity={pending ? SEVERITY_TO_DIALOG_SEVERITY[pending.severity] : "info"}
        confirmLabel={pending?.label ?? "Potvrdiť"}
        cancelLabel="Zrušiť"
        onConfirm={() => {
          if (pending) {
            const t = pending;
            setPending(null);
            void runTransition(t);
          }
        }}
      />
    </section>
  );
}
