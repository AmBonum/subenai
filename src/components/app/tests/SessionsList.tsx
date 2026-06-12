// E49 Phase 1 — paginated, sortable, filterable respondent list rendered
// inside the test editor's Results tab. Server-side pagination via
// `useTestSessions`. Row click navigates to the side-sheet child route.
//
// RLS owns access control; this component only shapes the request +
// renders rows. Identity hierarchy: name → email → "Anonymný respondent".

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { Copy, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { tFor } from "@/i18n/tests";
import {
  useTestSessions,
  useExportTestSessionsCsv,
  type TestSessionsSort,
  type TestSessionsStatus,
} from "@/lib/platform/queries";
import { copyToClipboard } from "@/lib/browser/clipboard";
import type { Session, TestStatus } from "@/lib/platform/types";

interface Props {
  testId: string;
  /** Drives the zero-sessions empty state: published → share-link CTA, draft → publish CTA. */
  status?: TestStatus;
  shareId?: string;
  onRequestPublish?: () => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

function respondentLabel(s: Session, anonLabel: string): string {
  const data = (s.intake_data ?? {}) as Record<string, string>;
  const name = (data.name ?? "").trim();
  if (name.length > 0) return name;
  const email = (data.email ?? "").trim();
  if (email.length > 0) return email;
  return anonLabel;
}

function formatStartedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function SessionsList({ testId, status, shareId, onRequestPublish }: Props) {
  const t = tFor("editor");
  const tSd = tFor("session_detail");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(20);
  const [sort, setSort] = useState<TestSessionsSort>("started_at_desc");
  const [statusFilter, setStatusFilter] = useState<TestSessionsStatus>("all");
  const [search, setSearch] = useState("");
  // Debounce the raw input before it reaches the query key — otherwise
  // every keystroke fires a Supabase round-trip. Page resets when the
  // debounced value commits, not per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => window.clearTimeout(id);
  }, [search]);

  const sessionsQ = useTestSessions(testId, {
    page,
    pageSize,
    sort,
    status: statusFilter,
    search: debouncedSearch,
  });
  const exportMut = useExportTestSessionsCsv(testId);

  const total = sessionsQ.data?.total ?? 0;
  const pageCount = sessionsQ.data?.pageCount ?? 1;
  const rows = sessionsQ.data?.rows ?? [];
  const fromIdx = total === 0 ? 0 : page * pageSize + 1;
  const toIdx = Math.min((page + 1) * pageSize, total);

  const onFilterChange = (next: () => void) => {
    setPage(0);
    next();
  };

  const onExport = async () => {
    try {
      const result = await exportMut.mutateAsync();
      // Browser-side download: object URL + synthetic <a> click + revoke
      // immediately. Same pattern used elsewhere for blob downloads.
      const url = URL.createObjectURL(result.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(
        <span data-testid="toast-export-csv-success">
          {t("export_csv_success", { count: total })}
        </span>,
      );
    } catch {
      toast.error(<span data-testid="toast-export-csv-error">{t("export_csv_error")}</span>);
    }
  };

  return (
    <div className="space-y-4" data-testid="test-sessions-list-root">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <Label htmlFor="sessions-search" className="text-xs text-muted-foreground">
            {t("filter_search_placeholder")}
          </Label>
          <Input
            id="sessions-search"
            value={search}
            placeholder={t("filter_search_placeholder")}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="test-sessions-list-search-input"
          />
        </div>
        <div className="min-w-[160px]">
          <Label className="text-xs text-muted-foreground">{t("filter_status_all")}</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => onFilterChange(() => setStatusFilter(v as TestSessionsStatus))}
          >
            <SelectTrigger data-testid="test-sessions-list-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filter_status_all")}</SelectItem>
              <SelectItem value="in_progress">{t("filter_status_in_progress")}</SelectItem>
              <SelectItem value="completed">{t("filter_status_completed")}</SelectItem>
              <SelectItem value="abandoned">{t("filter_status_abandoned")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[160px]">
          <Label className="text-xs text-muted-foreground">{t("sort_newest")}</Label>
          <Select
            value={sort}
            onValueChange={(v) => onFilterChange(() => setSort(v as TestSessionsSort))}
          >
            <SelectTrigger data-testid="test-sessions-list-sort-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="started_at_desc">{t("sort_newest")}</SelectItem>
              <SelectItem value="started_at_asc">{t("sort_oldest")}</SelectItem>
              <SelectItem value="score_desc">{t("sort_score_high")}</SelectItem>
              <SelectItem value="score_asc">{t("sort_score_low")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[120px]">
          <Label className="text-xs text-muted-foreground">{t("page_size")}</Label>
          <Select
            value={String(pageSize)}
            onValueChange={(v) => onFilterChange(() => setPageSize(Number(v)))}
          >
            <SelectTrigger data-testid="test-sessions-list-page-size-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          disabled={total === 0 || exportMut.isPending}
          data-testid="test-sessions-list-export-csv-button"
        >
          {exportMut.isPending ? "…" : t("export_csv_button")}
        </Button>
      </div>

      {sessionsQ.isLoading ? (
        <div className="space-y-2" data-testid="test-sessions-list-loading">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <div
          className="space-y-3 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"
          data-testid="test-sessions-list-empty"
        >
          {total === 0 && search.length === 0 && statusFilter === "all" ? (
            status === "published" && shareId ? (
              <>
                <p
                  className="font-medium text-foreground"
                  data-testid="test-sessions-list-empty-published-title"
                >
                  {t("sessions_empty_published_title")}
                </p>
                <p>{t("sessions_empty_published_body")}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void copyToClipboard(`${window.location.origin}/t/${shareId}`).then((ok) => {
                      if (ok) toast.success(t("sessions_empty_copy_success"));
                    });
                  }}
                  data-testid="test-sessions-list-empty-copy-link-button"
                >
                  <Copy className="mr-2 h-3 w-3" />
                  {t("sessions_empty_copy_link")}
                </Button>
              </>
            ) : status === "draft" ? (
              <>
                <p
                  className="font-medium text-foreground"
                  data-testid="test-sessions-list-empty-draft-title"
                >
                  {t("sessions_empty_draft_title")}
                </p>
                <p>{t("sessions_empty_draft_body")}</p>
                {onRequestPublish && (
                  <Button
                    size="sm"
                    onClick={onRequestPublish}
                    data-testid="test-sessions-list-empty-publish-button"
                  >
                    <Send className="mr-2 h-3 w-3" />
                    {t("sessions_empty_publish_cta")}
                  </Button>
                )}
              </>
            ) : (
              t("sessions_empty_no_data")
            )
          ) : (
            t("sessions_empty_no_match")
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">{t("sessions_list_title")}</th>
                <th className="px-3 py-2 text-left font-medium">{t("filter_status_all")}</th>
                <th className="px-3 py-2 text-left font-medium">{tSd("score")}</th>
                <th className="px-3 py-2 text-left font-medium">{tSd("started_at")}</th>
                <th className="px-3 py-2 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const label = respondentLabel(s, tSd("anonymous"));
                return (
                  <tr
                    key={s.id}
                    className="border-t hover:bg-muted/20"
                    data-testid={`test-sessions-list-row-${s.id}`}
                  >
                    <td className="px-3 py-2 max-w-[260px]">
                      <span
                        className="block truncate font-medium text-foreground"
                        title={label}
                        data-testid={`test-sessions-list-row-${s.id}-label`}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      {s.score == null ? "—" : `${s.score}%`}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatStartedAt(s.started_at)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        data-testid={`test-sessions-list-row-${s.id}-open`}
                      >
                        <Link
                          to="/app/tests/$testId/sessions/$sessionId"
                          params={{ testId, sessionId: s.id }}
                        >
                          {t("open_session")}
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span data-testid="test-sessions-list-pagination-info">
            {t("pagination_info", { from: fromIdx, to: toIdx, total })}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              data-testid="test-sessions-list-pagination-prev"
            >
              {t("pagination_prev")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              data-testid="test-sessions-list-pagination-next"
            >
              {t("pagination_next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
