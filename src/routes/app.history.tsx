import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { History as HistoryIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/app/page-header";
import { AppPageExplainer } from "@/components/user/AppPageExplainer";
import { useTestVersions, useTests, useUserSessions } from "@/lib/platform/queries";
import { tFor } from "@/i18n/tests";
import { tFor as tAppShell } from "@/i18n/app-shell";

const tRoutes = tAppShell("route_titles");

export const Route = createFileRoute("/app/history")({
  head: () => ({
    meta: [{ title: tRoutes("history") }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: HistoryPage,
});

type EventType = "session" | "version" | "status";

interface TimelineRow {
  id: string;
  type: EventType;
  test_id: string;
  test_title: string;
  actor: string;
  action: string;
  at: string;
}

function HistoryPage() {
  const t = tFor("history");
  const testsQ = useTests();
  const sessionsQ = useUserSessions();
  const versionsQ = useTestVersions();
  const versions = useMemo(() => versionsQ.data ?? [], [versionsQ.data]);
  const tests = useMemo(() => testsQ.data ?? [], [testsQ.data]);
  const sessions = useMemo(() => sessionsQ.data ?? [], [sessionsQ.data]);

  // RLS already scopes `tests` to those owned by or shared with the current
  // user; `ownedIds` reduces to "tests visible to me".
  const ownedIds = useMemo(() => new Set(tests.map((x) => x.id)), [tests]);

  const rows: TimelineRow[] = useMemo(() => {
    const map = new Map(tests.map((x) => [x.id, x] as const));
    const sessionRows: TimelineRow[] = sessions
      .filter((s) => ownedIds.has(s.test_id))
      .map((s) => ({
        id: `s_${s.id}`,
        type: "session" as EventType,
        test_id: s.test_id,
        test_title: map.get(s.test_id)?.title ?? s.test_id,
        actor: "Respondent",
        action: `Session ${s.status}`,
        at: s.started_at,
      }));
    const versionRows: TimelineRow[] = versions
      .filter((v) => ownedIds.has(v.test_id))
      .map((v) => ({
        id: `v_${v.id}`,
        type: "version" as EventType,
        test_id: v.test_id,
        test_title: map.get(v.test_id)?.title ?? v.test_id,
        actor: v.published_by,
        action: `v${v.version} — ${v.changelog}`,
        at: v.published_at,
      }));
    const statusRows: TimelineRow[] = tests
      .filter((x) => ownedIds.has(x.id) && x.published_at)
      .map((x) => ({
        id: `t_${x.id}`,
        type: "status" as EventType,
        test_id: x.id,
        test_title: x.title,
        actor: "Ty",
        action: `Test ${x.status}`,
        at: x.published_at ?? x.updated_at,
      }));
    return [...sessionRows, ...versionRows, ...statusRows].sort((a, b) => b.at.localeCompare(a.at));
  }, [tests, sessions, versions, ownedIds]);

  const ownedTests = useMemo(() => tests.filter((x) => ownedIds.has(x.id)), [tests, ownedIds]);

  const [testFilter, setTestFilter] = useState<string>("all");
  const [eventType, setEventType] = useState<"all" | EventType>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (testFilter !== "all" && r.test_id !== testFilter) return false;
        if (eventType !== "all" && r.type !== eventType) return false;
        if (from && r.at < from) return false;
        if (to && r.at > to + "T23:59:59") return false;
        return true;
      }),
    [rows, testFilter, eventType, from, to],
  );

  const clearFilters = () => {
    setTestFilter("all");
    setEventType("all");
    setFrom("");
    setTo("");
  };

  return (
    <div className="space-y-6" data-testid="history-root">
      <PageHeader
        eyebrow={t("page_eyebrow")}
        title={t("page_title")}
        accentWords={1}
        icon={HistoryIcon}
        subtitle={t("page_subtitle")}
      />

      <AppPageExplainer pageKey="history" />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t("test_filter_label")}</label>
            <Select value={testFilter} onValueChange={setTestFilter}>
              <SelectTrigger className="w-56" data-testid="history-test-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("test_filter_all")}</SelectItem>
                {ownedTests.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t("date_from_label")}</label>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              data-testid="history-date-from"
              className="w-44"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t("date_to_label")}</label>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              data-testid="history-date-to"
              className="w-44"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{t("event_type_label")}</label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as "all" | EventType)}>
              <SelectTrigger className="w-44" data-testid="history-event-type-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("event_type_all")}</SelectItem>
                <SelectItem value="session">{t("event_type_session")}</SelectItem>
                <SelectItem value="version">{t("event_type_version")}</SelectItem>
                <SelectItem value="status">{t("event_type_status")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            data-testid="history-clear-filters-button"
          >
            {t("clear_filters_button")}
          </Button>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card data-testid="history-empty-state">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {t("empty_state")}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, 100).map((r) => (
            <Card key={r.id} data-testid={`history-row-${r.id}`} className="border-border/60">
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-medium"
                    data-testid={`history-row-${r.id}-title`}
                  >
                    {r.test_title}
                  </p>
                  <p
                    className="text-xs text-muted-foreground"
                    data-testid={`history-row-${r.id}-action`}
                  >
                    {r.action}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge
                    variant="outline"
                    className="font-normal text-[10px]"
                    data-testid={`history-row-${r.id}-type-badge`}
                  >
                    {r.type === "session"
                      ? t("event_type_session")
                      : r.type === "version"
                        ? t("event_type_version")
                        : t("event_type_status")}
                  </Badge>
                  <span data-testid={`history-row-${r.id}-date`}>
                    {new Date(r.at).toLocaleString("sk-SK")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
