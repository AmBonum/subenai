import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/admin/PageHeader";
import { DsrQueue } from "@/components/admin/DsrQueue";
import { useDSR } from "@/lib/platform/mock-store";
import { tFor } from "@/i18n/governance";

export const Route = createFileRoute("/admin/dsr")({
  head: () => ({
    meta: [{ title: "DSR queue · Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminDsrPage,
});

function AdminDsrPage() {
  const t = tFor("dsr_queue");
  const dsr = useDSR();
  const open = dsr.filter((d) => d.status === "open" || d.status === "in_progress").length;
  return (
    <div className="space-y-6" data-testid="admin-dsr-root">
      <PageHeader
        title={t("title")}
        description={t("description", { open })}
        testId="admin-dsr-page-header"
      />
      <DsrQueue />
    </div>
  );
}
