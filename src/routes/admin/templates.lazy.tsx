import { createLazyFileRoute } from "@tanstack/react-router";

import { AdminPageExplainer } from "@/components/admin/AdminPageExplainer";
import { PageHeader } from "@/components/admin/PageHeader";
import { TemplateModerationQueue } from "@/components/admin/TemplateModerationQueue";

export const Route = createLazyFileRoute("/admin/templates")({
  component: AdminTemplatesPage,
});

function AdminTemplatesPage() {
  return (
    <div className="space-y-6" data-testid="admin-templates-root">
      <PageHeader
        title="Šablóny na schválenie"
        description="Skontroluj odoslané šablóny, schváľ ich do verejnej knižnice alebo zamietni s dôvodom."
        testId="admin-templates-page-header"
      />

      <AdminPageExplainer pageKey="templates_moderation" />
      <TemplateModerationQueue />
    </div>
  );
}
