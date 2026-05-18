import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Users, Activity, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/admin/StatCard";
import { useTests, useUserRespondents, useUserSessions } from "@/lib/platform/queries";
import { tFor } from "@/i18n/app-shell";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [{ title: "Môj prehľad · SubenAI" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AppDashboardPage,
});

function AppDashboardPage() {
  const t = tFor("dashboard");
  const testsQ = useTests();
  const sessionsQ = useUserSessions();
  const respondentsQ = useUserRespondents();
  const tests = testsQ.data ?? [];
  const sessions = sessionsQ.data ?? [];
  const respondents = respondentsQ.data ?? [];

  const activeTests = tests.filter((x) => x.status === "published").length;
  const recentSessions = sessions.length;
  const respondentCount = respondents.length;
  const completed = sessions.filter((s) => s.status === "completed").length;
  const completionRate = sessions.length ? Math.round((completed / sessions.length) * 100) : 0;

  return (
    <div className="space-y-6" data-testid="app-dashboard-root">
      <PageHeader
        eyebrow={t("page_header_eyebrow")}
        title={t("page_header_title")}
        accentWords={1}
        subtitle={t("page_header_subtitle")}
        testId="app-dashboard-page-header"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          testId="app-dashboard-stat-card-tests"
          label={t("stat.tests_label")}
          value={activeTests}
          icon={ClipboardList}
          tone="primary"
        />
        <StatCard
          testId="app-dashboard-stat-card-sessions"
          label={t("stat.sessions_label")}
          value={recentSessions}
          icon={Activity}
          tone="success"
        />
        <StatCard
          testId="app-dashboard-stat-card-respondents"
          label={t("stat.respondents_label")}
          value={respondentCount}
          icon={Users}
          tone="warning"
        />
        <StatCard
          testId="app-dashboard-stat-card-completion"
          label={t("stat.completion_label")}
          value={`${completionRate}%`}
          icon={CheckCircle2}
          tone="success"
        />
      </div>
    </div>
  );
}
