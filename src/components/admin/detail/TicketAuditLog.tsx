import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

import { AUDIT_ACTION_LABEL_SK } from "./ticket-labels";

interface TicketAuditLogProps {
  ticketId: string;
}

interface AuditEntry {
  id: string;
  actor_name: string | null;
  action: string;
  at: string;
  details: unknown;
}

function useTicketAuditLog(ticketId: string) {
  return useQuery({
    queryKey: ["admin", "ticket-audit-log", ticketId],
    queryFn: async (): Promise<AuditEntry[]> => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, actor_name, action, at, details")
        .eq("target_type", "support_tickets")
        .eq("target_id", ticketId)
        .order("at", { ascending: false })
        .limit(5);
      if (error) {
        // The audit log is best-effort — failures shouldn't break the page.
        console.warn("ticket audit log query failed", error);
        return [];
      }
      return (data ?? []) as AuditEntry[];
    },
    enabled: !!ticketId,
    refetchInterval: 60_000,
  });
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return "pred chvíľou";
  if (diffSec < 3600) return `pred ${Math.round(diffSec / 60)} min`;
  if (diffSec < 86400) return `pred ${Math.round(diffSec / 3600)} h`;
  return `pred ${Math.round(diffSec / 86400)} d`;
}

export function TicketAuditLog({ ticketId }: TicketAuditLogProps) {
  const { data: entries, isLoading } = useTicketAuditLog(ticketId);

  return (
    <section
      className="rounded-md border border-border bg-card p-4"
      data-testid="admin-ticket-audit-log"
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Audit log
      </h2>

      {isLoading ? (
        <p
          className="mt-2 text-xs text-muted-foreground"
          data-testid="admin-ticket-audit-log-loading"
        >
          Načítavam…
        </p>
      ) : !entries || entries.length === 0 ? (
        <p
          className="mt-2 text-xs text-muted-foreground"
          data-testid="admin-ticket-audit-log-empty"
        >
          Žiadne záznamy
        </p>
      ) : (
        <ul className="mt-2 space-y-2 text-xs" data-testid="admin-ticket-audit-log-entries">
          {entries.map((e) => (
            <li
              key={e.id}
              className="border-l-2 border-border pl-3"
              data-testid={`admin-ticket-audit-log-entry-${e.id}`}
            >
              <div className="text-foreground">
                <span className="font-medium">{e.actor_name ?? "Systém"}</span>{" "}
                <span className="text-muted-foreground">
                  {AUDIT_ACTION_LABEL_SK[e.action] ?? e.action}
                </span>
              </div>
              <div className="text-muted-foreground">{relativeTime(e.at)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
