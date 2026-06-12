import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Lock,
  Send,
  Archive,
  CopyPlus,
  FileEdit,
  Share2,
  Sparkles,
  ExternalLink,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/app/page-header";
import { AppPageExplainer } from "@/components/user/AppPageExplainer";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { lifecycleErrorMessage } from "@/components/app/tests/lifecycle-errors";
import { useAudiences, useDeleteTest, useDuplicateTest, useTests } from "@/lib/platform/queries";
import type { Test } from "@/lib/platform/types";
import { tFor } from "@/i18n/tests";
import { tFor as tAppShell } from "@/i18n/app-shell";

const tRoutes = tAppShell("route_titles");

export const Route = createFileRoute("/app/tests/")({
  head: () => ({
    meta: [{ title: tRoutes("tests_index") }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: TestsList,
});

type StatusFilter = "all" | "published" | "draft" | "archived";

function TestsList() {
  const t = tFor("list");
  const testsQ = useTests();
  const audiencesQ = useAudiences();
  const duplicateMut = useDuplicateTest();
  const deleteMut = useDeleteTest();
  // RLS filters tests to those owned by or shared with the current user.
  const owned = useMemo(() => testsQ.data ?? [], [testsQ.data]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [branch, setBranch] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<Test | null>(null);

  const audienceNameById = useMemo(
    () => new Map((audiencesQ.data ?? []).map((g) => [g.id, g.name])),
    [audiencesQ.data],
  );

  const branches = useMemo(
    () => Array.from(new Set(owned.flatMap((x) => x.segmentation))).sort(),
    [owned],
  );

  const filtered = useMemo(
    () =>
      owned.filter(
        (x) =>
          (status === "all" || x.status === status) &&
          (branch === "all" || x.segmentation.includes(branch)) &&
          (!search || x.title.toLowerCase().includes(search.toLowerCase())),
      ),
    [owned, status, branch, search],
  );

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setBranch("all");
  };

  const onDuplicate = (id: string) => {
    duplicateMut.mutate(id, {
      onSuccess: () => toast.success(t("duplicate_success")),
      onError: (err) => toast.error(lifecycleErrorMessage(err)),
    });
  };

  const onDeleteConfirmed = () => {
    if (!deleteTarget) return;
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => toast.success(t("delete_success")),
      onError: (err) => toast.error(lifecycleErrorMessage(err)),
    });
  };

  // True-empty = the educator genuinely owns zero tests. A failed query
  // (isError) falls back to the filter-empty card instead — the first-run
  // CTA would be misleading when the list simply failed to load.
  const isTrueEmpty = !testsQ.isLoading && !testsQ.isError && owned.length === 0;

  return (
    <div className="space-y-6" data-testid="tests-list-root">
      <PageHeader
        eyebrow={t("page_eyebrow")}
        title={t("page_title")}
        accentWords={1}
        subtitle={t("page_subtitle")}
        actions={
          <Button
            size="sm"
            asChild
            className="btn-primary"
            data-testid="tests-list-new-test-button"
          >
            <Link to="/app/tests/new">
              <Plus className="mr-2 h-3 w-3" />
              {t("new_test_button")}
            </Link>
          </Button>
        }
      />

      <AppPageExplainer pageKey="tests" />

      {isTrueEmpty ? (
        <Card data-testid="tests-list-empty-initial">
          <CardContent className="space-y-4 p-8 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-semibold" data-testid="tests-list-empty-initial-title">
              {t("empty_initial_title")}
            </h2>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              {t("empty_initial_body")}
            </p>
            <div className="flex justify-center">
              <Button asChild data-testid="tests-list-empty-initial-cta">
                <Link to="/app/tests/new">
                  <Plus className="mr-2 h-3 w-3" />
                  {t("empty_initial_cta")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-wrap items-center gap-2 p-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder={t("search_placeholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="tests-list-search-input"
                />
              </div>
              {/* TabsList is `inline-flex` so the four status chips never wrap;
              on viewports <420px the "Archív" trigger overflows the parent
              (E36 A3 finding 2026-05-20). Wrapping in an overflow-x-auto
              container lets mobile users swipe the chip row horizontally
              without breaking the desktop layout. */}
              <div className="-mx-1 max-w-full overflow-x-auto px-1">
                <Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                  <TabsList data-testid="tests-list-status-filter">
                    <TabsTrigger value="all" data-testid="tests-list-status-tab-all">
                      {t("status_all")} ({owned.length})
                    </TabsTrigger>
                    <TabsTrigger value="published" data-testid="tests-list-status-tab-published">
                      <Send className="mr-1 h-3 w-3" />
                      {t("status_published")}
                    </TabsTrigger>
                    <TabsTrigger value="draft" data-testid="tests-list-status-tab-draft">
                      <FileEdit className="mr-1 h-3 w-3" />
                      {t("status_draft")}
                    </TabsTrigger>
                    <TabsTrigger value="archived" data-testid="tests-list-status-tab-archived">
                      <Archive className="mr-1 h-3 w-3" />
                      {t("status_archived")}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="w-44" data-testid="tests-list-branch-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("branch_all")}</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                data-testid="tests-list-clear-filters-button"
              >
                {t("clear_filters")}
              </Button>
            </CardContent>
          </Card>

          {filtered.length === 0 ? (
            <Card data-testid="tests-list-empty-state">
              <CardContent className="space-y-3 p-8 text-center text-sm text-muted-foreground">
                <p>{t("empty_state")}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  data-testid="tests-list-empty-state-clear-filters"
                >
                  {t("clear_filters")}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filtered.map((x) => (
                <Card
                  key={x.id}
                  data-testid={`tests-list-row-${x.id}`}
                  className="border-border/60 transition hover:border-primary/60"
                >
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div
                          className="truncate font-medium"
                          data-testid={`tests-list-row-title-${x.id}`}
                        >
                          {x.title}
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">
                          {x.description}
                        </p>
                      </div>
                      <StatusBadge status={x.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{t("version_label", { version: x.version })}</span>
                      <span>·</span>
                      <span>{t("questions_count", { count: x.question_ids.length })}</span>
                      {x.password && (
                        <>
                          <span>·</span>
                          <Lock className="h-3 w-3" />
                          {t("password_label")}
                        </>
                      )}
                      {x.segmentation.map((s) => (
                        <Badge key={s} variant="secondary" className="font-normal text-[10px]">
                          {s}
                        </Badge>
                      ))}
                      {x.audience_group_id && audienceNameById.has(x.audience_group_id) && (
                        <Badge
                          variant="outline"
                          className="font-normal text-[10px]"
                          data-testid={`tests-list-row-audience-${x.id}`}
                        >
                          <Users className="mr-1 h-2.5 w-2.5" aria-hidden />
                          {audienceNameById.get(x.audience_group_id)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        data-testid={`tests-list-row-open-${x.id}`}
                      >
                        <Link to="/app/tests/$testId" params={{ testId: x.id }}>
                          <ExternalLink className="mr-1 h-3 w-3" />
                          {t("row_open")}
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                        data-testid={`tests-list-row-share-${x.id}`}
                      >
                        <Link
                          to="/app/tests/$testId"
                          params={{ testId: x.id }}
                          search={{ share: "1" }}
                        >
                          <Share2 className="mr-1 h-3 w-3" />
                          {t("row_share")}
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDuplicate(x.id)}
                        disabled={duplicateMut.isPending}
                        data-testid={`tests-list-row-duplicate-${x.id}`}
                      >
                        <CopyPlus className="mr-1 h-3 w-3" />
                        {t("row_duplicate")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(x)}
                        disabled={deleteMut.isPending}
                        data-testid={`tests-list-row-delete-${x.id}`}
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        {t("row_delete")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("delete_confirm_title")}
        description={t("delete_confirm_body", { title: deleteTarget?.title ?? "" })}
        confirmLabel={t("delete_confirm_button")}
        severity="destructive"
        typedConfirm={
          deleteTarget
            ? { expected: deleteTarget.title, label: t("delete_confirm_typed_label") }
            : undefined
        }
        onConfirm={onDeleteConfirmed}
      />
    </div>
  );
}
