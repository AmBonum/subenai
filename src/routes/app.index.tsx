import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList,
  Users,
  Activity,
  CheckCircle2,
  ArrowRight,
  FileEdit,
  Sparkles,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/admin/StatCard";
import { ProfileCompletionBanner } from "@/components/auth/ProfileCompletionBanner";
import { useTests, useUserRespondents, useUserSessions } from "@/lib/platform/queries";
import { tFor } from "@/i18n/app-shell";

const tRoutes = tFor("route_titles");

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [{ title: tRoutes("dashboard") }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AppDashboardPage,
});

const INTRO_KEY = "subenai.dashboard_intro_seen";

function useIntroBanner(): { visible: boolean; dismiss: () => void } {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(INTRO_KEY);
      if (!seen) setVisible(true);
    } catch {
      // ignore storage failures
    }
  }, []);
  const dismiss = () => {
    try {
      window.localStorage.setItem(INTRO_KEY, "1");
    } catch {
      // ignore
    }
    setVisible(false);
  };
  return { visible, dismiss };
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMin = Math.max(1, Math.round((now - then) / 60000));
  if (diffMin < 60) return `pred ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `pred ${diffH} h`;
  const diffD = Math.round(diffH / 24);
  return `pred ${diffD} d`;
}

function AppDashboardPage() {
  const t = tFor("dashboard");
  const testsQ = useTests();
  const sessionsQ = useUserSessions();
  const respondentsQ = useUserRespondents();
  const tests = useMemo(() => testsQ.data ?? [], [testsQ.data]);
  const sessions = useMemo(() => sessionsQ.data ?? [], [sessionsQ.data]);
  const respondents = respondentsQ.data ?? [];
  const intro = useIntroBanner();

  const isEmpty = tests.length === 0 && sessions.length === 0 && respondents.length === 0;

  const activeTests = tests.filter((x) => x.status === "published").length;
  const recentSessions = sessions.length;
  const respondentCount = respondents.length;
  const completed = sessions.filter((s) => s.status === "completed").length;
  const completionRate = sessions.length ? Math.round((completed / sessions.length) * 100) : 0;

  // "Tvoj posledný test": the most recently updated published test with at
  // least one session in the last 7 days. Counts as "new responses since
  // your last visit" until the real last_login_at lands in a later phase.
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const sinceCutoff = Date.now() - SEVEN_DAYS_MS;
  const lastTest = useMemo(() => {
    const candidates = tests
      .filter((x) => x.status === "published")
      .map((x) => {
        const recent = sessions.filter(
          (s) => s.test_id === x.id && new Date(s.started_at).getTime() >= sinceCutoff,
        );
        return { test: x, count: recent.length };
      })
      .filter((c) => c.count > 0);
    candidates.sort((a, b) => b.count - a.count);
    return candidates[0];
  }, [tests, sessions, sinceCutoff]);

  // "Čo sa zmenilo od pondelka" — counts of finished sessions and tests
  // touched (status change or new version) since the last Monday 00:00.
  const sinceMonday = useMemo(() => {
    const d = new Date();
    const day = d.getDay(); // 0=Sun..6=Sat
    const back = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - back);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const completionsThisWeek = sessions.filter(
    (s) =>
      s.status === "completed" && s.finished_at && new Date(s.finished_at).getTime() >= sinceMonday,
  ).length;
  const testsTouchedThisWeek = tests.filter(
    (x) => new Date(x.updated_at).getTime() >= sinceMonday,
  ).length;
  const hasDelta = completionsThisWeek > 0 || testsTouchedThisWeek > 0;

  const drafts = useMemo(() => tests.filter((x) => x.status === "draft").slice(0, 3), [tests]);

  return (
    <div className="space-y-6" data-testid="app-dashboard-root">
      <ProfileCompletionBanner />
      <PageHeader
        eyebrow={t("page_header_eyebrow")}
        title={t("page_header_title")}
        accentWords={1}
        subtitle={t("page_header_subtitle")}
        testId="app-dashboard-page-header"
      />

      {isEmpty ? (
        <Card data-testid="app-dashboard-empty-state">
          <CardContent className="space-y-4 p-8 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold" data-testid="app-dashboard-empty-title">
              {t("empty.title")}
            </h2>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">{t("empty.body")}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild data-testid="app-dashboard-empty-cta-primary">
                <Link to="/app/tests/new">{t("empty.cta_primary")}</Link>
              </Button>
              <Button asChild variant="outline" data-testid="app-dashboard-empty-cta-secondary">
                <Link to="/app/templates">{t("empty.cta_secondary")}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {intro.visible && (
            <Card
              className="border-primary/30 bg-primary/5"
              data-testid="app-dashboard-intro-banner"
            >
              <CardContent className="flex items-start gap-3 p-5">
                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <h3 className="font-semibold" data-testid="app-dashboard-intro-title">
                    {t("intro.title")}
                  </h3>
                  <p className="text-sm text-muted-foreground">{t("intro.body")}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" asChild data-testid="app-dashboard-intro-cta">
                      <Link to="/app/templates">{t("intro.cta")}</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={intro.dismiss}
                      data-testid="app-dashboard-intro-dismiss"
                    >
                      {t("intro.dismiss")}
                    </Button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={intro.dismiss}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={t("intro.dismiss")}
                  data-testid="app-dashboard-intro-close"
                >
                  <X className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          )}

          {lastTest && (
            <Card data-testid="app-dashboard-last-test-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("last_test.title")}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <p
                  className="text-sm text-muted-foreground"
                  data-testid="app-dashboard-last-test-headline"
                >
                  {t("last_test.headline", {
                    title: lastTest.test.title,
                    count: lastTest.count,
                    time: formatRelative(lastTest.test.updated_at),
                  })}
                </p>
                <Button
                  size="sm"
                  asChild
                  variant="outline"
                  data-testid="app-dashboard-last-test-cta"
                >
                  <Link to="/app/tests/$testId" params={{ testId: lastTest.test.id }}>
                    {t("last_test.cta")}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {hasDelta && (
            <Card data-testid="app-dashboard-delta-card">
              <CardContent className="flex items-center gap-3 p-5">
                <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t("delta.title")}</p>
                  <p
                    className="text-sm text-muted-foreground"
                    data-testid="app-dashboard-delta-summary"
                  >
                    {t("delta.summary", {
                      n: completionsThisWeek,
                      m: testsTouchedThisWeek,
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {drafts.length > 0 && (
            <Card data-testid="app-dashboard-drafts-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("drafts.title")}</CardTitle>
                <p className="text-xs text-muted-foreground">{t("drafts.subtitle")}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {drafts.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/40 p-3"
                    data-testid={`app-dashboard-drafts-row-${d.id}`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{d.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("drafts.last_edited", { time: formatRelative(d.updated_at) })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      asChild
                      data-testid={`app-dashboard-drafts-continue-${d.id}`}
                    >
                      <Link to="/app/tests/$testId" params={{ testId: d.id }}>
                        <FileEdit className="mr-1 h-3 w-3" />
                        {t("drafts.continue")}
                      </Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Phase 4-7: digest, course recs, retest, peer cards land here */}

          <div className="space-y-3 pt-2" data-testid="app-dashboard-stats-section">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {t("stats_section_title")}
            </h2>
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
        </>
      )}
    </div>
  );
}
