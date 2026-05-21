import { createLazyFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/admin/PageHeader";
import { AdminPageExplainer } from "@/components/admin/AdminPageExplainer";
import { DpaRequestsQueue } from "@/components/admin/DpaRequestsQueue";
import { useAdminDpaRequests } from "@/lib/admin/queries";
import { tFor } from "@/i18n/governance";

export const Route = createLazyFileRoute("/admin/dpa-requests")({
  component: AdminDpaRequestsPage,
});

function AdminDpaRequestsPage() {
  const t = tFor("dpa_queue");
  const rows = useAdminDpaRequests().data ?? [];
  const open = rows.filter((r) => r.status === "pending" || r.status === "delivered").length;
  return (
    <div className="space-y-6" data-testid="admin-dpa-requests-root">
      <PageHeader
        title={t("title")}
        description={t("description", { open })}
        testId="admin-dpa-requests-page-header"
      />

      <AdminPageExplainer pageKey="dpa_requests" />
      <DpaRequestsQueue />
    </div>
  );
}
