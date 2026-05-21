import { createLazyFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/admin/PageHeader";
import { AdminPageExplainer } from "@/components/admin/AdminPageExplainer";
import { DsrQueue } from "@/components/admin/DsrQueue";
import { useAdminDSRQueue } from "@/lib/admin/queries";
import { tFor } from "@/i18n/governance";

export const Route = createLazyFileRoute("/admin/dsr")({
  component: AdminDsrPage,
});

function AdminDsrPage() {
  const t = tFor("dsr_queue");
  const dsr = useAdminDSRQueue().data ?? [];
  const open = dsr.filter((d) => d.status === "open" || d.status === "in_progress").length;
  return (
    <div className="space-y-6" data-testid="admin-dsr-root">
      <PageHeader
        title={t("title")}
        description={t("description", { open })}
        testId="admin-dsr-page-header"
      />

      <AdminPageExplainer pageKey="dsr" />
      <DsrQueue />
    </div>
  );
}
