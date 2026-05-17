import { createFileRoute } from "@tanstack/react-router";
import { Users, ClipboardList, Activity, ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardStats, mockAdminActivity } from "@/lib/admin/mock-data";
import { tFor } from "@/i18n/admin";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const t = tFor("dashboard");
  const activity = mockAdminActivity;

  return (
    <div className="space-y-6" data-testid="admin-dashboard-root">
      <PageHeader
        title={t("title")}
        description={t("description")}
        testId="admin-dashboard-page-header"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("stat_users")}
          value={dashboardStats.total_users}
          delta={12}
          icon={Users}
          tone="primary"
          testId="admin-stat-card-users"
        />
        <StatCard
          label={t("stat_tests")}
          value={dashboardStats.total_tests}
          delta={6}
          icon={ClipboardList}
          tone="success"
          testId="admin-stat-card-tests"
        />
        <StatCard
          label={t("stat_sessions")}
          value={dashboardStats.total_sessions}
          delta={18}
          icon={Activity}
          tone="primary"
          testId="admin-stat-card-sessions"
        />
        <StatCard
          label={t("stat_dsr_pending")}
          value={dashboardStats.pending_dsr}
          delta={-25}
          icon={ShieldAlert}
          tone="warning"
          testId="admin-stat-card-dsr-pending"
        />
      </div>

      <Card
        className="border-border/60 shadow-[var(--shadow-card)]"
        data-testid="admin-dashboard-recent-activity"
      >
        <CardHeader>
          <CardTitle>{t("recent_activity_title")}</CardTitle>
          <CardDescription>{t("recent_activity_description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {activity.length === 0 ? (
            <p
              className="text-sm text-muted-foreground"
              data-testid="admin-dashboard-recent-activity-empty"
            >
              {t("recent_activity_description")}
            </p>
          ) : (
            <ul className="space-y-2">
              {activity.map((evt) => (
                <li
                  key={evt.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border/40 bg-card/40 px-3 py-2"
                  data-testid={`admin-dashboard-recent-activity-row-${evt.id}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{evt.summary}</p>
                    <p className="text-xs text-muted-foreground">{evt.actor}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(evt.created_at).toLocaleString("sk-SK")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
