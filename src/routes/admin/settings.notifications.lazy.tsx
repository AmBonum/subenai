import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { AdminNotificationPreferences } from "@/components/admin/AdminNotificationPreferences";
import { PageHeader } from "@/components/admin/PageHeader";
import { Button } from "@/components/ui/button";

export const Route = createLazyFileRoute("/admin/settings/notifications")({
  component: AdminSettingsNotificationsPage,
});

function AdminSettingsNotificationsPage() {
  return (
    <div className="space-y-6" data-testid="admin-settings-notifications-root">
      <Button asChild variant="ghost" size="sm" data-testid="admin-settings-notifications-back">
        <Link to="/admin/settings">
          <ArrowLeft className="mr-1 size-4" aria-hidden="true" /> Späť na nastavenia
        </Link>
      </Button>
      <PageHeader
        title="Upozornenia z podpory"
        description="Spravujte si, ako vás chceme upozorňovať na nové a aktualizované žiadosti z modulu Podpora. Nastavenia platia iba pre váš účet."
        testId="admin-settings-notifications-header"
      />
      <AdminNotificationPreferences />
    </div>
  );
}
