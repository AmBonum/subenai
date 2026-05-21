import { createLazyFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/admin/PageHeader";
import { SupportTicketsQueue } from "@/components/admin/SupportTicketsQueue";

export const Route = createLazyFileRoute("/admin/tickets")({
  component: AdminTicketsPage,
});

function AdminTicketsPage() {
  return (
    <div className="space-y-6" data-testid="admin-tickets-root">
      <PageHeader
        title="Žiadosti podpory"
        description="Filtruj, vyhľadávaj a odpovedaj na žiadosti používateľov."
        testId="admin-tickets-page-header"
      />
      <SupportTicketsQueue />
    </div>
  );
}
