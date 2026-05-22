import { Badge } from "@/components/ui/badge";
import type {
  AdminSupportTicketRow,
  AdminSupportTicketMessage,
  AdminSupportTicketAttachment,
} from "@/lib/admin/queries-tickets";

interface TicketThreadProps {
  ticket: AdminSupportTicketRow;
  messages: AdminSupportTicketMessage[];
  attachments: AdminSupportTicketAttachment[];
}

// PR-DETAIL contrast fix: drop the washed-out `bg-emerald-50/60` tint
// (under 3:1 vs `text-muted-foreground` in dark mode). Admin replies
// now sit on solid `bg-accent` with a left primary accent rail; user
// messages on `bg-card`. Both render body text as `text-foreground`
// which is near-white in dark, near-black in light → well above AA.
export function TicketThread({ ticket, messages, attachments }: TicketThreadProps) {
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
        // Admin bubbles intentionally pair `bg-accent` with
        // `text-accent-foreground` (rather than `text-foreground`) so
        // body text uses the design-system's paired token — both light
        // and dark themes guarantee AA contrast against `--accent`.

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

        return (
          <article
            key={m.id}
            className={
              isAdmin
                ? "rounded-md border border-border border-l-4 border-l-primary bg-accent p-4 text-accent-foreground"
                : "rounded-md border border-border bg-card p-4 text-foreground"
            }
            data-testid={`admin-ticket-detail-message-${m.id}`}
            data-author-kind={m.author_kind}
          >
            <div
              className={
                isAdmin
                  ? "text-xs uppercase tracking-wide text-accent-foreground/80"
                  : "text-xs uppercase tracking-wide text-muted-foreground"
              }
            >
              {m.author_name}
              <span className="ml-2 normal-case">
                {new Date(m.created_at).toLocaleString("sk-SK")}
              </span>
              <Badge variant="outline" className="ml-2 text-[10px] normal-case">
                {isAdmin ? "admin" : "používateľ"}
              </Badge>
            </div>
            <p
              className={
                isAdmin
                  ? "mt-2 whitespace-pre-wrap text-sm text-accent-foreground"
                  : "mt-2 whitespace-pre-wrap text-sm text-foreground"
              }
            >
              {m.body}
            </p>
          </article>
        );
      })}

      {attachments.length > 0 && (
        <div
          className="rounded-md border border-border bg-card p-4"
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
  );
}
