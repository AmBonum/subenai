// E48-v2 PR-DETAIL — shared Slovak label maps and FSM transition graph
// for the admin ticket detail sub-components. Kept colocated under
// `detail/` so other modules don't accidentally reuse them; the queue
// has its own STATUS_BADGE_CLASS that's intentionally separate.

import { SUPPORT_TICKET_CATEGORIES } from "@/components/support/support-form-config";

export const STATUS_LABEL_SK: Record<string, string> = {
  new: "Nové",
  in_progress: "V riešení",
  waiting_user: "Čaká na používateľa",
  resolved: "Vyriešené",
  reopened: "Znovu otvorené",
  archived: "Archivované",
};

export const CATEGORY_LABEL_SK: Record<string, string> = Object.fromEntries(
  SUPPORT_TICKET_CATEGORIES.map((c) => [c.value, c.label]),
);

export const SOURCE_LABEL_SK: Record<string, string> = {
  web: "Web",
  email: "E-mail",
  app: "Aplikácia",
  api: "API",
  import: "Import",
};

export const STATUS_BADGE_CLASS: Record<string, string> = {
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

export type TicketStatus =
  | "new"
  | "in_progress"
  | "waiting_user"
  | "resolved"
  | "reopened"
  | "archived";

export type TransitionSeverity = "default" | "success" | "warning" | "destructive";

export interface StatusTransition {
  to: TicketStatus;
  label: string;
  severity: TransitionSeverity;
  needsConfirm: boolean;
}

// FSM graph mirrors the server-side transition_ticket_status RPC. Only
// transitions the admin can take from the current status are listed.
export const FSM_TRANSITIONS: Record<TicketStatus, StatusTransition[]> = {
  new: [{ to: "in_progress", label: "Začať riešiť", severity: "default", needsConfirm: false }],
  in_progress: [
    { to: "waiting_user", label: "Čakať na používateľa", severity: "default", needsConfirm: false },
    { to: "resolved", label: "Označiť ako vyriešené", severity: "success", needsConfirm: true },
  ],
  waiting_user: [
    { to: "in_progress", label: "Vrátiť do riešenia", severity: "default", needsConfirm: false },
    { to: "resolved", label: "Označiť ako vyriešené", severity: "success", needsConfirm: true },
  ],
  resolved: [
    { to: "reopened", label: "Znovu otvoriť", severity: "default", needsConfirm: false },
    { to: "archived", label: "Archivovať", severity: "warning", needsConfirm: true },
  ],
  reopened: [
    { to: "in_progress", label: "Začať riešiť", severity: "default", needsConfirm: false },
  ],
  archived: [
    { to: "reopened", label: "Obnoviť z archívu", severity: "default", needsConfirm: false },
  ],
};

// Slovak labels for audit log `action` values that this page surfaces.
// Anything not in the map renders verbatim.
export const AUDIT_ACTION_LABEL_SK: Record<string, string> = {
  "support_ticket.created": "Vytvorené",
  "support_ticket.assigned": "Pridelené",
  "support_ticket.unassigned": "Odpridelené",
  "support_ticket.status_changed": "Zmena stavu",
  "support_ticket.replied": "Pridaná odpoveď admina",
  "support_ticket.soft_deleted": "Označené ako spam",
  "support_ticket.restored": "Obnovené",
};
