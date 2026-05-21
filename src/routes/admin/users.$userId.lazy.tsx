import { createLazyFileRoute, useParams, Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/admin/PageHeader";
import { UserDossier } from "@/components/admin/UserDossier";
import { tFor } from "@/i18n/governance";

export const Route = createLazyFileRoute("/admin/users/$userId")({
  component: AdminUserDossierPage,
});

function AdminUserDossierPage() {
  const t = tFor("user_dossier");
  const { userId } = useParams({ from: "/admin/users/$userId" });

  return (
    <div className="space-y-6" data-testid="admin-user-dossier-root">
      <PageHeader
        title={t("title")}
        description={t("description")}
        testId="admin-user-dossier-page-header"
      />
      <Link
        to="/admin/users"
        data-testid="admin-user-dossier-back-link"
        className="inline-flex text-sm text-muted-foreground hover:text-foreground"
      >
        {t("back_link")}
      </Link>
      <UserDossier userId={userId} />
    </div>
  );
}
