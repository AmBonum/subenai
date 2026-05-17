import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/admin/PageHeader";
import { ReportsQueue } from "@/components/admin/ReportsQueue";
import { tFor } from "@/i18n/governance";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [{ title: "Reporty · Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
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
      <ReportsQueue />
    </div>
  );
}
