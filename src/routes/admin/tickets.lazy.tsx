import { createLazyFileRoute, Outlet, useChildMatches } from "@tanstack/react-router";

import { PageHeader } from "@/components/admin/PageHeader";
import { AdminPageExplainer } from "@/components/admin/AdminPageExplainer";
import { SupportTicketsQueue } from "@/components/admin/SupportTicketsQueue";

export const Route = createLazyFileRoute("/admin/tickets")({
  component: AdminTicketsPage,
});

function AdminTicketsPage() {
  // E48 fix: this parent route hosts both the queue (no child match) and
  // the detail view (child match on /$ticketId). Without the Outlet,
  // navigating to /admin/tickets/<id> changed the URL but never rendered
  // the SupportTicketDetail component — the queue kept showing.
  const hasChildMatch = useChildMatches().length > 0;
  if (hasChildMatch) {
    return <Outlet />;
  }
  return (
    <div className="space-y-6" data-testid="admin-tickets-root">
      <PageHeader
        title="Žiadosti podpory"
        description="Filtruj, vyhľadávaj a odpovedaj na žiadosti používateľov."
        testId="admin-tickets-page-header"
      />
      <AdminPageExplainer pageKey="support" />
      <SupportTicketsQueue />
    </div>
  );
}
