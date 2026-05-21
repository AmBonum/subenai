import { createLazyFileRoute, useParams } from "@tanstack/react-router";

import { SupportTicketDetail } from "@/components/admin/SupportTicketDetail";

export const Route = createLazyFileRoute("/admin/tickets/$ticketId")({
  component: AdminTicketDetailPage,
});

function AdminTicketDetailPage() {
  const { ticketId } = useParams({ from: "/admin/tickets/$ticketId" });
  return <SupportTicketDetail ticketId={ticketId} />;
}
