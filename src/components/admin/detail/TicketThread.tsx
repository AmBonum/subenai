import { Badge } from "@/components/ui/badge";
import type {
  AdminSupportTicketDetailRow,
  AdminSupportTicketMessage,
} from "@/lib/admin/queries-tickets";

interface TicketThreadProps {
  ticket: AdminSupportTicketDetailRow;
  messages: AdminSupportTicketMessage[];
}

// PR-DETAIL contrast fix: drop the washed-out `bg-emerald-50/60` tint
// (under 3:1 vs `text-muted-foreground` in dark mode). Admin replies
// now sit on solid `bg-accent` with a left primary accent rail; user
// messages on `bg-card`. Both render body text as `text-foreground`
// which is near-white in dark, near-black in light → well above AA.
export function TicketThread({ ticket, messages }: TicketThreadProps) {
  return (
    <div className="space-y-4" data-testid="admin-ticket-detail-thread">
      {/* Initial body — treated as the first user message. */}
      <article
        className="rounded-md border border-border bg-card p-4 text-foreground"
        data-testid="admin-ticket-detail-initial-message"
      >
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {ticket.submitter_name ?? ticket.submitter_email}
          <span className="ml-2 normal-case">
            {new Date(ticket.created_at).toLocaleString("sk-SK")}
          </span>
          <Badge variant="outline" className="ml-2 text-[10px] normal-case">
            používateľ
          </Badge>
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{ticket.body}</p>
      </article>

      {messages.map((m) => {
        const isAdmin = m.author_kind === "admin";
        const isSystem = m.author_kind === "system";
        const isInternal = m.is_internal === true;
        // Admin bubbles intentionally pair `bg-accent` with
        // `text-accent-foreground` (rather than `text-foreground`) so
        // body text uses the design-system's paired token — both light
        // and dark themes guarantee AA contrast against `--accent`.
        // Internal notes get an amber tint + left rail so they're
        // visually unmistakable (the submitter never sees them, but
        // every admin should know at a glance the note is private).

        if (isSystem) {
          return (
            <p
              key={m.id}
              className="text-xs text-muted-foreground"
              data-testid={`admin-ticket-detail-message-${m.id}`}
            >
              <span className="font-medium">{m.author_name}</span>: <span>{m.body}</span>{" "}
              <span className="text-muted-foreground/70">
                · {new Date(m.created_at).toLocaleString("sk-SK")}
              </span>
            </p>
          );
        }

        const bubbleClass = isInternal
          ? "rounded-md border border-amber-300 border-l-4 border-l-amber-500 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:border-l-amber-400 dark:bg-amber-950/40 dark:text-amber-50"
          : isAdmin
            ? "rounded-md border border-border border-l-4 border-l-primary bg-accent p-4 text-accent-foreground"
            : "rounded-md border border-border bg-card p-4 text-foreground";

        const metaClass = isInternal
          ? "text-xs uppercase tracking-wide text-amber-900 dark:text-amber-100"
          : isAdmin
            ? "text-xs uppercase tracking-wide text-accent-foreground/80"
            : "text-xs uppercase tracking-wide text-muted-foreground";

        const bodyClass = isInternal
          ? "mt-2 whitespace-pre-wrap text-sm text-amber-950 dark:text-amber-50"
          : isAdmin
            ? "mt-2 whitespace-pre-wrap text-sm text-accent-foreground"
            : "mt-2 whitespace-pre-wrap text-sm text-foreground";

        return (
          <article
            key={m.id}
            className={bubbleClass}
            data-testid={`admin-ticket-detail-message-${m.id}`}
            data-author-kind={m.author_kind}
            data-is-internal={isInternal ? "true" : "false"}
          >
            <div className={metaClass}>
              {m.author_name}
              <span className="ml-2 normal-case">
                {new Date(m.created_at).toLocaleString("sk-SK")}
              </span>
              <Badge variant="outline" className="ml-2 text-[10px] normal-case">
                {isAdmin ? "admin" : "používateľ"}
              </Badge>
              {isInternal && (
                <Badge
                  variant="outline"
                  className="ml-2 border-amber-400 bg-amber-100 text-[10px] normal-case text-amber-900 dark:border-amber-500 dark:bg-amber-900/60 dark:text-amber-50"
                  data-testid={`admin-ticket-detail-message-internal-badge-${m.id}`}
                >
                  Interná poznámka
                </Badge>
              )}
            </div>
            <p className={bodyClass}>{m.body}</p>
          </article>
        );
      })}
    </div>
  );
}
