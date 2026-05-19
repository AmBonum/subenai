import { createLazyFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  MoreHorizontal,
  Plus,
  Download,
  Filter,
  MessageSquare,
  ThumbsUp,
  Flag,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { QuestionEditor } from "@/components/admin/QuestionEditor";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BRANCHES, branchLabel } from "@/lib/admin/branches";
import type { AdminQuestion } from "@/lib/admin/types";
import {
  useAdminQuestions,
  useCreateQuestion,
  useUpdateQuestion,
  useDeleteQuestion,
} from "@/lib/admin/queries";
import { AdminListLoading, AdminListError } from "@/components/admin/AdminListLoading";
import { exportToCSV } from "@/lib/admin/export";
import { tFor } from "@/i18n/questions";

export const Route = createLazyFileRoute("/admin/questions")({
  component: QuestionsPage,
});

const PAGE_SIZE = 25;

// AH-4.1: gate the AI generator at the route. Until VITE_AI_GENERATOR_ENABLED
// is flipped to "true" (post-AH-4 dedicated AI epic) the AI button never renders.
const AI_ENABLED = import.meta.env.VITE_AI_GENERATOR_ENABLED === "true";

function QuestionsPage() {
  const t = tFor("admin_list");
  const questionsQuery = useAdminQuestions();
  const createQuestion = useCreateQuestion();
  const updateQuestion = useUpdateQuestion();
  const deleteQuestion = useDeleteQuestion();
  const questions = useMemo(() => questionsQuery.data ?? [], [questionsQuery.data]);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [minVotes, setMinVotes] = useState(-50);
  const [reportedOnly, setReportedOnly] = useState(false);
  const [author, setAuthor] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AdminQuestion | null>(null);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    description?: string;
    destructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Radix `<Select.Item />` forbids value=""; questions seeded from the
  // bank have no author_name (NULL → mapped to ""), so filter empties
  // before they reach the SelectItem map below.
  const authors = useMemo(
    () => Array.from(new Set(questions.map((q) => q.author_name).filter((n) => Boolean(n)))).sort(),
    [questions],
  );

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      if (status !== "all" && q.status !== status) return false;
      if (category !== "all" && !q.categories.includes(category)) return false;
      if (author !== "all" && q.author_name !== author) return false;
      if (q.votes < minVotes) return false;
      if (reportedOnly && q.reports_count === 0) return false;
      if (query && !q.title.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [questions, query, status, category, author, minVotes, reportedOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const allSelected = paged.length > 0 && paged.every((q) => selected.has(q.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allSelected) paged.forEach((q) => next.delete(q.id));
    else paged.forEach((q) => next.add(q.id));
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const clearSelection = () => setSelected(new Set());

  const handleSave = (data: Partial<AdminQuestion>) => {
    const onError = (err: Error) => toast.error(err.message);
    if (editing) {
      updateQuestion.mutate(
        { id: editing.id, patch: data },
        { onSuccess: () => toast.success(t("toast_question_saved")), onError },
      );
    } else {
      createQuestion.mutate(data, {
        onSuccess: () => toast.success(t("toast_question_created")),
        onError,
      });
    }
  };

  const bulkUpdateStatus = (ids: string[], status: AdminQuestion["status"]) => {
    for (const id of ids) {
      updateQuestion.mutate(
        { id, patch: { status } },
        {
          onError: (err: Error) => toast.error(err.message),
        },
      );
    }
  };

  const bulkDelete = (ids: string[]) => {
    for (const id of ids) {
      deleteQuestion.mutate(id, { onError: (err: Error) => toast.error(err.message) });
    }
  };

  const askBulk = (label: string, fn: () => void, destructive?: boolean) =>
    setConfirm({
      open: true,
      title: t("confirm_bulk_title", { label, count: selected.size }),
      description: t("confirm_bulk_description"),
      destructive,
      onConfirm: () => {
        fn();
        clearSelection();
        toast.success(t("confirm_bulk_done", { label }));
      },
    });

  const resetFilters = () => {
    setQuery("");
    setStatus("all");
    setCategory("all");
    setAuthor("all");
    setMinVotes(-50);
    setReportedOnly(false);
    setPage(1);
  };

  const doExport = () => {
    exportToCSV(
      filtered,
      [
        { key: "id", label: t("csv_id") },
        { key: "title", label: t("csv_question") },
        { key: "categories", label: t("csv_branches") },
        { key: "status", label: t("csv_status") },
        { key: "author_name", label: t("csv_author") },
        { key: "votes", label: t("csv_votes") },
        { key: "answers_count", label: t("csv_answers") },
        { key: "reports_count", label: t("csv_reports") },
        { key: "created_at", label: t("csv_created") },
      ],
      `otazky-${new Date().toISOString().slice(0, 10)}`,
    );
    toast.success(t("toast_export", { count: filtered.length }));
  };

  return (
    <div data-testid="admin-questions-root" className="space-y-6">
      <PageHeader
        testId="admin-questions-header"
        title={t("page_title")}
        description={t("page_description")}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={doExport}
              data-testid="admin-questions-export-button"
            >
              <Download className="mr-2 h-4 w-4" />
              {t("export_button")}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
              data-testid="admin-questions-new-button"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("new_button")}
            </Button>
          </>
        }
      />

      <Card className="border-border/60 shadow-[var(--shadow-card)]">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              data-testid="admin-questions-search-input"
              placeholder={t("search_placeholder")}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="sm:max-w-xs"
            />
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="sm:w-[180px]" data-testid="admin-questions-status-filter">
                <SelectValue placeholder={t("status_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("status_all")}</SelectItem>
                <SelectItem value="published">{t("status_published")}</SelectItem>
                <SelectItem value="pending">{t("status_pending")}</SelectItem>
                <SelectItem value="flagged">{t("status_flagged")}</SelectItem>
                <SelectItem value="archived">{t("status_archived")}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={category}
              onValueChange={(v) => {
                setCategory(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="sm:w-[200px]" data-testid="admin-questions-branch-filter">
                <SelectValue placeholder={t("branch_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("branch_all")}</SelectItem>
                {BRANCHES.map((b) => (
                  <SelectItem key={b.slug} value={b.slug}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto"
                  data-testid="admin-questions-more-filters-button"
                >
                  <Filter className="mr-2 h-4 w-4" />
                  {t("more_filters")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs">{t("author_label")}</Label>
                  <Select value={author} onValueChange={setAuthor}>
                    <SelectTrigger data-testid="admin-questions-author-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("author_all")}</SelectItem>
                      {authors.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{t("min_votes_label", { votes: minVotes })}</Label>
                  <Slider
                    min={-50}
                    max={200}
                    step={5}
                    value={[minVotes]}
                    onValueChange={(v) => setMinVotes(v[0])}
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={reportedOnly}
                    onCheckedChange={(v) => setReportedOnly(Boolean(v))}
                  />
                  {t("reported_only")}
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={resetFilters}
                  data-testid="admin-questions-clear-filters-button"
                >
                  <X className="mr-2 h-3 w-3" /> {t("clear_filters")}
                </Button>
              </PopoverContent>
            </Popover>
          </div>

          {selected.size > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
              <span className="font-medium text-primary">
                {t("selected_count", { count: selected.size })}
              </span>
              <div className="ml-auto flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    askBulk(t("publish"), () => bulkUpdateStatus([...selected], "published"))
                  }
                >
                  {t("publish")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    askBulk(t("archive"), () => bulkUpdateStatus([...selected], "archived"))
                  }
                >
                  {t("archive")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => askBulk(t("delete"), () => bulkDelete([...selected]), true)}
                >
                  {t("delete")}
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {questionsQuery.isLoading && <AdminListLoading testId="admin-questions-loading" />}
          {questionsQuery.error && (
            <AdminListError error={questionsQuery.error as Error} testId="admin-questions-error" />
          )}

          <div className="overflow-hidden rounded-lg border border-border/60">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-[40px]">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>{t("table_question")}</TableHead>
                  <TableHead>{t("table_branch")}</TableHead>
                  <TableHead>{t("table_status")}</TableHead>
                  <TableHead className="text-right">{t("table_activity")}</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((q) => (
                  <TableRow
                    key={q.id}
                    className="group"
                    data-testid={`admin-questions-list-row-${q.id}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selected.has(q.id)}
                        onCheckedChange={() => toggleOne(q.id)}
                      />
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-1 text-sm font-medium text-foreground">{q.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {q.author_name} · {new Date(q.created_at).toLocaleDateString("sk-SK")}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {q.categories.map((c) => (
                          <span
                            key={c}
                            className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
                          >
                            {branchLabel(c)}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={q.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {q.answers_count}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {q.votes}
                        </span>
                        {q.reports_count > 0 && (
                          <span className="inline-flex items-center gap-1 text-destructive">
                            <Flag className="h-3 w-3" />
                            {q.reports_count}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          data-testid={`admin-questions-row-edit-${q.id}`}
                          onClick={() => {
                            setEditing(q);
                            setEditorOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              data-testid={`admin-questions-row-menu-${q.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{t("row_actions")}</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditing(q);
                                setEditorOpen(true);
                              }}
                            >
                              {t("row_edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                updateQuestion.mutate(
                                  { id: q.id, patch: { status: "published" } },
                                  {
                                    onSuccess: () => toast.success(t("toast_published")),
                                    onError: (err: Error) => toast.error(err.message),
                                  },
                                )
                              }
                            >
                              {t("row_publish")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                updateQuestion.mutate(
                                  { id: q.id, patch: { status: "archived" } },
                                  {
                                    onSuccess: () => toast.success(t("toast_archived")),
                                    onError: (err: Error) => toast.error(err.message),
                                  },
                                )
                              }
                            >
                              {t("row_archive")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                navigator.clipboard?.writeText(q.id);
                                toast.success(t("toast_id_copied"));
                              }}
                            >
                              {t("row_copy_id")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              data-testid={`admin-questions-row-delete-${q.id}`}
                              onClick={() =>
                                setConfirm({
                                  open: true,
                                  title: t("confirm_delete_title"),
                                  description: q.title,
                                  destructive: true,
                                  onConfirm: () => {
                                    deleteQuestion.mutate(q.id, {
                                      onSuccess: () => toast.success(t("toast_question_deleted")),
                                      onError: (err: Error) => toast.error(err.message),
                                    });
                                  },
                                })
                              }
                            >
                              {t("row_delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {paged.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      data-testid="admin-questions-empty-state"
                      className="py-12 text-center text-sm text-muted-foreground"
                    >
                      {t("no_results")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span data-testid="admin-questions-pagination-summary">
              {t("pagination_summary", {
                shown: paged.length,
                filtered: filtered.length,
                total: questions.length,
              })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("pagination_prev")}
              </Button>
              <span>
                {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t("pagination_next")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <QuestionEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        question={editing}
        onSave={handleSave}
        aiEnabled={AI_ENABLED}
      />

      {confirm && (
        <ConfirmDialog
          open={confirm.open}
          onOpenChange={(o) => setConfirm((c) => (c ? { ...c, open: o } : null))}
          title={confirm.title}
          description={confirm.description}
          destructive={confirm.destructive}
          onConfirm={confirm.onConfirm}
        />
      )}
    </div>
  );
}
