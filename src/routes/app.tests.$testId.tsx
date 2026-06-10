import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  ArrowLeft,
  Archive,
  BarChart3,
  ListTree,
  Mail,
  Save,
  Send,
  Settings,
  Share2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ShareDialog } from "@/components/user/ShareDialog";
import { QuestionsEditor } from "@/components/app/tests/QuestionsEditor";
import { OrderModeToggle } from "@/components/app/tests/OrderModeToggle";
import { PasswordCard } from "@/components/app/tests/PasswordCard";
import { InviteEmailDialog } from "@/components/app/tests/InviteEmailDialog";
import { SessionsList } from "@/components/app/tests/SessionsList";
import { ComingSoonBadge } from "@/components/feature-gates/ComingSoonBadge";
import { ProBadge } from "@/components/feature-gates/ProBadge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getFeatureGate } from "@/lib/feature-gates";
import { toast } from "sonner";
import {
  useArchiveTest,
  usePublishTest,
  useTest,
  useTestSessions,
  useUpdateTest,
} from "@/lib/platform/queries";
import { tFor } from "@/i18n/tests";
import { tFor as tAppShell } from "@/i18n/app-shell";

const tRoutes = tAppShell("route_titles");

const editorSearch = z.object({
  tab: z.enum(["results", "analytics", "questions", "settings"]).catch("results"),
  share: z.string().optional(),
});

type EditorTab = "results" | "analytics" | "questions" | "settings";

export const Route = createFileRoute("/app/tests/$testId")({
  validateSearch: editorSearch,
  head: () => ({
    meta: [{ title: tRoutes("test_editor") }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: TestEditorPage,
});

function TestEditorPage() {
  const t = tFor("editor");
  const { testId } = useParams({ from: "/app/tests/$testId" });
  const search = useSearch({ from: "/app/tests/$testId" });
  const nav = useNavigate({ from: "/app/tests/$testId" });
  const testQ = useTest(testId);
  // KPI cards: total respondents (all statuses), completed count, avg
  // score. We fetch the first page just to get total via the count header
  // and a small sample for the avg; for an accurate avg over all completed
  // sessions we issue a second query scoped to status=completed with the
  // max page size we allow (100). For typical author scale this is the
  // right trade-off; E49 Phase 2+ will move the aggregate to an RPC.
  const totalQ = useTestSessions(testId, { page: 0, pageSize: 1, status: "all" });
  const completedQ = useTestSessions(testId, { page: 0, pageSize: 100, status: "completed" });
  const updateMut = useUpdateTest();
  const publishMut = usePublishTest();
  const archiveMut = useArchiveTest();
  const test = testQ.data ?? null;

  const [title, setTitle] = useState(test?.title ?? "");
  const [description, setDescription] = useState(test?.description ?? "");
  const [shareOpen, setShareOpen] = useState(search.share === "1");
  const [inviteOpen, setInviteOpen] = useState(false);

  // useTest resolves async, so the useState initializers above see no data
  // on a deep-link/refresh. Sync once per test identity — keyed on the id
  // so a background refetch never clobbers in-flight user edits.
  const syncedTestIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (test && syncedTestIdRef.current !== test.id) {
      syncedTestIdRef.current = test.id;
      setTitle(test.title);
      setDescription(test.description);
    }
  }, [test]);

  const totalRespondents = totalQ.data?.total ?? 0;
  const completedRows = completedQ.data?.rows ?? [];
  const completedCount = completedQ.data?.total ?? 0;
  const avgScore =
    completedRows.length > 0
      ? Math.round(completedRows.reduce((a, s) => a + (s.score ?? 0), 0) / completedRows.length)
      : 0;

  if (testQ.isLoading) {
    return (
      <div className="space-y-6" data-testid="test-editor-loading">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!test) {
    return (
      <div
        className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"
        data-testid="test-editor-not-found"
      >
        <p className="font-medium text-foreground">{t("not_found_title")}</p>
        <p className="mt-1">{t("not_found_body")}</p>
        <Link
          to="/app/tests"
          className="mt-3 inline-flex items-center gap-1 text-xs text-primary underline"
        >
          <ArrowLeft className="h-3 w-3" />
          {t("back_to_list")}
        </Link>
      </div>
    );
  }

  const onSave = () => {
    updateMut.mutate(
      { id: test.id, patch: { title: title.trim(), description: description.trim() } },
      { onError: (err) => toast.error(err.message) },
    );
  };

  const onArchive = () => {
    archiveMut.mutate(test.id, { onError: (err) => toast.error(err.message) });
  };

  const onPublish = () => {
    publishMut.mutate(test.id, { onError: (err) => toast.error(err.message) });
  };

  const setTab = (tab: EditorTab) => {
    nav({ search: (prev: Record<string, unknown>) => ({ ...prev, tab }), replace: true });
  };

  return (
    <div className="space-y-6" data-testid="test-editor-root">
      <PageHeader
        eyebrow={t("page_eyebrow")}
        title={test.title}
        accentWords={1}
        subtitle={
          <span className="flex items-center gap-2">
            <StatusBadge status={test.status} />
            <span>v{test.version}</span>
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShareOpen(true)}
              data-testid="test-editor-share-button"
            >
              <Share2 className="mr-2 h-3 w-3" />
              {t("share_button")}
            </Button>
            {test.status === "published" &&
              (() => {
                const inviteGate = getFeatureGate("email_invites");
                const inviteLocked = inviteGate !== null;
                // Tooltip + badge copy depend on the gate type — copy is
                // chosen once here so the JSX below stays branch-free.
                const tooltipKey =
                  inviteGate === "pro" ? "invite_pro_tooltip" : "invite_coming_soon_tooltip";
                const inviteBtn = (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (!inviteLocked) setInviteOpen(true);
                    }}
                    disabled={inviteLocked}
                    aria-disabled={inviteLocked}
                    data-testid="test-editor-invite-button"
                    data-gate={inviteGate ?? "open"}
                    className={inviteLocked ? "opacity-70" : undefined}
                  >
                    <Mail className="mr-2 h-3 w-3" />
                    {t("invite_button")}
                    {inviteGate === "coming_soon" && <ComingSoonBadge className="ml-2" />}
                    {inviteGate === "pro" && <ProBadge className="ml-2" />}
                  </Button>
                );
                if (!inviteLocked) return inviteBtn;
                // Wrapping a disabled <button> in a Tooltip needs a span
                // because Radix's TooltipTrigger uses pointer events that
                // disabled buttons swallow. The span keeps the tooltip
                // reachable for keyboard + mouse users on locked buttons.
                return (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span tabIndex={0} data-testid="test-editor-invite-tooltip-trigger">
                          {inviteBtn}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        className="max-w-xs"
                        data-testid="test-editor-invite-gate-tooltip"
                      >
                        {t(tooltipKey as never)}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })()}
            {test.status !== "archived" && (
              <Button
                size="sm"
                variant="outline"
                onClick={onArchive}
                disabled={archiveMut.isPending}
                data-testid="test-editor-archive-button"
              >
                <Archive className="mr-2 h-3 w-3" />
                {t("archive_button")}
              </Button>
            )}
            <Button
              size="sm"
              onClick={onPublish}
              disabled={publishMut.isPending}
              data-testid="test-editor-publish-button"
            >
              <Send className="mr-2 h-3 w-3" />
              {t("publish_button")}
            </Button>
          </div>
        }
      />

      <Tabs value={search.tab ?? "results"} onValueChange={(v) => setTab(v as EditorTab)}>
        <TabsList>
          <TabsTrigger value="results" data-testid="test-editor-tabs-results">
            <BarChart3 className="mr-1 h-3 w-3" />
            {t("tab_results")}
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="test-editor-tabs-analytics">
            <BarChart3 className="mr-1 h-3 w-3" />
            {t("tab_analytics")}
          </TabsTrigger>
          <TabsTrigger value="questions" data-testid="test-editor-tabs-questions">
            <ListTree className="mr-1 h-3 w-3" />
            {t("tab_questions")}
          </TabsTrigger>
          <TabsTrigger value="settings" data-testid="test-editor-tabs-settings">
            <Settings className="mr-1 h-3 w-3" />
            {t("tab_settings")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3" data-testid="test-editor-results-kpis">
            <Card data-testid="test-editor-kpi-total">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {t("kpi_total")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">{totalRespondents}</p>
              </CardContent>
            </Card>
            <Card data-testid="test-editor-kpi-completed">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {t("kpi_completed")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">{completedCount}</p>
              </CardContent>
            </Card>
            <Card data-testid="test-editor-kpi-avg-score">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {t("kpi_avg_score")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tabular-nums">{avgScore}%</p>
              </CardContent>
            </Card>
          </div>
          <Card data-testid="test-editor-results-panel">
            <CardHeader>
              <CardTitle>{t("sessions_list_title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <SessionsList testId={test.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card data-testid="test-editor-analytics-panel">
            <CardHeader>
              <CardTitle>{t("tab_analytics")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>Sessions: {totalRespondents}</p>
              <p>Otázok: {test.question_ids.length}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="mt-4">
          <Card data-testid="test-editor-questions-panel">
            <CardHeader>
              <CardTitle>{t("tab_questions")}</CardTitle>
            </CardHeader>
            <CardContent>
              <QuestionsEditor testId={test.id} questionIds={test.question_ids} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card data-testid="test-editor-settings-panel">
            <CardHeader>
              <CardTitle>{t("tab_settings")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="ed-title">{t("title_input_label")}</Label>
                <Input
                  id="ed-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  data-testid="test-editor-title-input"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ed-desc">{t("description_input_label")}</Label>
                <Textarea
                  id="ed-desc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  data-testid="test-editor-description-input"
                />
              </div>
              <OrderModeToggle testId={test.id} value={test.question_order_mode} />
              <div className="border-t pt-6">
                <PasswordCard testId={test.id} hasPassword={test.has_password} />
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={onSave}
                  disabled={updateMut.isPending}
                  data-testid="test-editor-save-button"
                >
                  <Save className="mr-2 h-3 w-3" />
                  {t("save_button")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ShareDialog open={shareOpen} onOpenChange={setShareOpen} shareId={test.share_id} />
      <InviteEmailDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        testId={test.id}
        hasPassword={test.has_password}
      />
      {/* Child routes (e.g. /sessions/$sessionId) mount here as portal'd
          side sheets layered above the editor. */}
      <Outlet />
    </div>
  );
}
