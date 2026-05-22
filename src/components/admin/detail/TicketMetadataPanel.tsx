import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { AdminSupportTicketDetailRow } from "@/lib/admin/queries-tickets";

import { SOURCE_LABEL_SK } from "./ticket-labels";

interface TicketMetadataPanelProps {
  ticket: AdminSupportTicketDetailRow;
}

interface ExtendedMeta {
  user_agent: string | null;
  ip_country: string | null;
}

function useExtendedMeta(ticketId: string) {
  return useQuery({
    queryKey: ["admin", "support_ticket_meta", ticketId],
    queryFn: async (): Promise<ExtendedMeta> => {
      const { data } = await supabase
        .from("support_tickets")
        .select("user_agent, ip_country")
        .eq("id", ticketId)
        .maybeSingle();
      return {
        user_agent: (data as ExtendedMeta | null)?.user_agent ?? null,
        ip_country: (data as ExtendedMeta | null)?.ip_country ?? null,
      };
    },
    enabled: !!ticketId,
    staleTime: 60_000,
  });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("sk-SK");
  } catch {
    return iso;
  }
}

function truncate(s: string, n = 80): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export function TicketMetadataPanel({ ticket }: TicketMetadataPanelProps) {
  const { data: meta } = useExtendedMeta(ticket.id);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(ticket.id);
      toast.success("ID skopírované do schránky.");
    } catch {
      toast.error("Schránku nebolo možné otvoriť.");
    }
  }

  return (
    <section
      className="rounded-md border border-border bg-card p-4"
      data-testid="admin-ticket-metadata-panel"
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Metadáta
      </h2>

      <dl className="mt-2 space-y-2 text-xs">
        <div>
          <dt className="text-muted-foreground">ID</dt>
          <dd className="mt-0.5 flex items-center gap-1">
            <code
              className="break-all text-[11px] text-foreground"
              data-testid="admin-ticket-metadata-id"
            >
              {ticket.id}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              onClick={copyId}
              aria-label="Kopírovať ID"
              data-testid="admin-ticket-metadata-copy-id"
            >
              <Copy className="size-3" aria-hidden="true" />
            </Button>
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Vytvorené</dt>
          <dd className="mt-0.5 text-foreground" data-testid="admin-ticket-metadata-created-at">
            {fmtDate(ticket.created_at)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Posledná zmena</dt>
          <dd className="mt-0.5 text-foreground" data-testid="admin-ticket-metadata-updated-at">
            {fmtDate(ticket.updated_at)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Zdroj</dt>
          <dd className="mt-0.5 text-foreground" data-testid="admin-ticket-metadata-source">
            {SOURCE_LABEL_SK[ticket.source] ?? ticket.source}
          </dd>
        </div>
        {meta?.ip_country && (
          <div>
            <dt className="text-muted-foreground">Krajina (IP)</dt>
            <dd className="mt-0.5 text-foreground" data-testid="admin-ticket-metadata-country">
              {meta.ip_country}
            </dd>
          </div>
        )}
        {meta?.user_agent && (
          <div>
            <dt className="text-muted-foreground">User agent</dt>
            <dd
              className="mt-0.5 break-words text-foreground"
              title={meta.user_agent}
              data-testid="admin-ticket-metadata-user-agent"
            >
              {truncate(meta.user_agent, 80)}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
