import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/admin/PageHeader";
import { RespondentsList } from "@/components/admin/RespondentsList";
import { useAdminRespondents } from "@/lib/admin/queries";
import { tFor } from "@/i18n/governance";
import { tFor as tAdmin } from "@/i18n/admin";

const tRoutes = tAdmin("route_titles");

export const Route = createFileRoute("/admin/respondents")({
  head: () => ({
    meta: [{ title: tRoutes("respondents") }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdminRespondentsPage,
});

function AdminRespondentsPage() {
  const t = tFor("respondents_list");
  const respondents = useAdminRespondents().data ?? [];
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
