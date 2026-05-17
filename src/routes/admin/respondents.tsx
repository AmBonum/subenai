import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/admin/PageHeader";
import { RespondentsList } from "@/components/admin/RespondentsList";
import { useRespondents } from "@/lib/platform/mock-store";
import { tFor } from "@/i18n/governance";

export const Route = createFileRoute("/admin/respondents")({
  head: () => ({
    meta: [{ title: "Respondenti · Admin" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminRespondentsPage,
});

function AdminRespondentsPage() {
  const t = tFor("respondents_list");
  const respondents = useRespondents();
  return (
    <div className="space-y-6" data-testid="admin-respondents-root">
      <PageHeader
        title={t("title")}
        description={t("description", { count: respondents.length })}
        testId="admin-respondents-page-header"
      />
      <RespondentsList />
    </div>
  );
}
