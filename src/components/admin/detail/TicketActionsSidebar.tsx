import type { AdminSupportTicketRow } from "@/lib/admin/queries-tickets";

import { TicketStatusActions } from "./TicketStatusActions";
import { TicketAssignmentActions } from "./TicketAssignmentActions";
import { TicketMetadataPanel } from "./TicketMetadataPanel";
import { TicketAuditLog } from "./TicketAuditLog";
import type { TicketStatus } from "./ticket-labels";

interface TicketActionsSidebarProps {
  ticket: AdminSupportTicketRow;
}

export function TicketActionsSidebar({ ticket }: TicketActionsSidebarProps) {
  return (
    <aside
      className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start"
      data-testid="admin-ticket-actions-sidebar"
    >
      <TicketStatusActions ticketId={ticket.id} status={ticket.status as TicketStatus} />
      <TicketAssignmentActions ticketId={ticket.id} assignedTo={ticket.assigned_to} />
      <TicketMetadataPanel ticket={ticket} />
      <TicketAuditLog ticketId={ticket.id} />
    </aside>
  );
}
