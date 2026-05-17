import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/admin/PageHeader";
import { AuditLogViewer } from "@/components/admin/AuditLogViewer";
import { tFor } from "@/i18n/governance";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [{ title: "Audit log · Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminAuditPage,
});

function AdminAuditPage() {
  const t = tFor("audit_log");
  return (
    <div className="space-y-6" data-testid="admin-audit-root">
      <PageHeader
        title={t("title")}
        description={t("description")}
        testId="admin-audit-page-header"
      />
      <AuditLogViewer />
    </div>
  );
}
