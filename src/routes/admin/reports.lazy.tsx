import { createLazyFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/admin/PageHeader";
import { AdminPageExplainer } from "@/components/admin/AdminPageExplainer";
import { ReportsQueue } from "@/components/admin/ReportsQueue";
import { tFor } from "@/i18n/governance";

export const Route = createLazyFileRoute("/admin/reports")({
  component: AdminReportsPage,
});

function AdminReportsPage() {
  const t = tFor("reports_queue");
  return (
    <div className="space-y-6" data-testid="admin-reports-root">
      <PageHeader
        title={t("title")}
        description={t("description")}
        testId="admin-reports-page-header"
      />

      <AdminPageExplainer pageKey="reports" />
      <ReportsQueue />
    </div>
  );
}
