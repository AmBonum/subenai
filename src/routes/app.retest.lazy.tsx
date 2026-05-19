import { createLazyFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { RefreshCw, ArrowRight, X, Clock, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import {
  useAllRetestReminders,
  useDismissRetest,
  useSnoozeRetest,
  useMarkRetested,
  type RetestReminder,
} from "@/lib/platform/retention-queries";
import { tFor } from "@/i18n/app-shell";

export const Route = createLazyFileRoute("/app/retest")({
  component: RetestPage,
});

type TFn = (key: string, vars?: Record<string, string | number>) => string;

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function daysUntil(isoDate: string): number {
  const then = new Date(isoDate).getTime();
  const diff = then - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("sk-SK", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

function isDueNow(r: RetestReminder): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const remindOk = r.remind_after <= today;
  const snoozeOk = !r.snoozed_until || r.snoozed_until <= today;
  return remindOk && snoozeOk;
}

function RetestPage() {
  const t = tFor("retest");
  const listQ = useAllRetestReminders();
  const reminders = useMemo(() => listQ.data ?? [], [listQ.data]);

  const due = useMemo(() => reminders.filter(isDueNow), [reminders]);
  const upcoming = useMemo(() => reminders.filter((r) => !isDueNow(r)), [reminders]);

  return (
    <div className="space-y-6" data-testid="app-retest-root">
      <PageHeader
        eyebrow={t("page_header_eyebrow")}
        title={t("heading")}
        accentWords={1}
        icon={RefreshCw}
        subtitle={t("subheading")}
        testId="app-retest-page-header"
      />

      {reminders.length === 0 ? (
        <Card data-testid="app-retest-empty-state">
          <CardContent className="space-y-3 p-8 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <RefreshCw className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold" data-testid="app-retest-empty-title">
              {t("empty_title")}
            </h2>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">{t("empty_body")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {due.length > 0 && (
            <section className="space-y-3" data-testid="app-retest-due-section">
              <h2
                className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
                data-testid="app-retest-due-heading"
              >
                {t("section_due")}
              </h2>
              <div className="space-y-3" data-testid="app-retest-due-list">
                {due.map((r) => (
                  <ReminderCard key={r.id} reminder={r} t={t} due />
                ))}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section className="space-y-3" data-testid="app-retest-upcoming-section">
              <h2
                className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
                data-testid="app-retest-upcoming-heading"
              >
                {t("section_upcoming")}
              </h2>
              <div className="space-y-3" data-testid="app-retest-upcoming-list">
                {upcoming.map((r) => (
                  <ReminderCard key={r.id} reminder={r} t={t} due={false} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

interface CardProps {
  reminder: RetestReminder;
  t: TFn;
  due: boolean;
}

function ReminderCard({ reminder, t, due }: CardProps) {
  const dismiss = useDismissRetest();
  const snooze = useSnoozeRetest();
  const markRetested = useMarkRetested();

  const title = reminder.test?.title ?? reminder.test_id;
  const ago = daysSince(reminder.last_session_at);
  const score = reminder.last_score != null ? Math.round(Number(reminder.last_score)) : null;

  return (
    <Card className={due ? "border-primary/30" : ""} data-testid={`app-retest-card-${reminder.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base" data-testid={`app-retest-card-title-${reminder.id}`}>
            {title}
          </CardTitle>
          <button
            type="button"
            onClick={() => dismiss.mutate(reminder.id)}
            className="text-muted-foreground hover:text-foreground"
            aria-label={t("dismiss_cta")}
            data-testid={`app-retest-card-dismiss-${reminder.id}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span data-testid={`app-retest-card-last-session-${reminder.id}`}>
            {t("last_session_label", { days: ago })}
          </span>
          <span data-testid={`app-retest-card-sessions-count-${reminder.id}`}>
            {t("sessions_count_label", { count: reminder.sessions_count })}
          </span>
          {score != null && (
            <span data-testid={`app-retest-card-score-${reminder.id}`}>
              {t("avg_score_label", { score })}
            </span>
          )}
          {!due && (
            <span data-testid={`app-retest-card-due-in-${reminder.id}`}>
              {t("due_in_label", {
                days: daysUntil(reminder.remind_after),
                date: formatDate(reminder.remind_after),
              })}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            asChild
            onClick={() => markRetested.mutate(reminder.id)}
            data-testid={`app-retest-card-run-${reminder.id}`}
          >
            <Link to="/app/tests/$testId" params={{ testId: reminder.test_id }}>
              {t("run_retest_cta")}
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => snooze.mutate(reminder.id)}
            data-testid={`app-retest-card-snooze-${reminder.id}`}
          >
            <Clock className="mr-1 h-3 w-3" />
            {t("snooze_cta")}
          </Button>
          {reminder.retested_at && (
            <span
              className="inline-flex items-center gap-1 text-xs text-success"
              data-testid={`app-retest-card-retested-${reminder.id}`}
            >
              <CheckCircle2 className="h-3 w-3" />
              {t("retested_label")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
