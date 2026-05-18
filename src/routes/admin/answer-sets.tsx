import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Library, Check, X, ArrowRight, MoreHorizontal, Pencil } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/PageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { branchLabel } from "@/lib/admin/branches";
import type { AdminAnswerSet } from "@/lib/admin/types";
import {
  useAdminAnswerSets,
  useAdminAnswers,
  useAdminQuestions,
  useCreateAnswer,
  useCreateAnswerSet,
  useDeleteAnswerSet,
} from "@/lib/admin/queries";
import { AdminListLoading, AdminListError } from "@/components/admin/AdminListLoading";
import { tFor } from "@/i18n/questions";

export const Route = createFileRoute("/admin/answer-sets")({
  component: AnswerSetsPage,
});

function AnswerSetsPage() {
  const t = tFor("answer_sets_list");
  const setsQuery = useAdminAnswerSets();
  const answersQuery = useAdminAnswers();
  const questionsQuery = useAdminQuestions();
  const createSet = useCreateAnswerSet();
  const createAnswer = useCreateAnswer();
  const deleteSet = useDeleteAnswerSet();
  const allSets = useMemo(() => setsQuery.data ?? [], [setsQuery.data]);
  const allAnswers = useMemo(() => answersQuery.data ?? [], [answersQuery.data]);
  const allQuestions = useMemo(() => questionsQuery.data ?? [], [questionsQuery.data]);
  const [query, setQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<AdminAnswerSet | null>(null);

  const onMutationError = (err: Error) => toast.error(err.message);

  // Duplicate composes read-then-write via the existing hooks: re-fetch the
  // source set's answers, create a new set, then copy each child answer. No
  // dedicated useDuplicateAnswerSet hook in queries.ts; this client-side
  // composition is intentional and avoids a server fn for AH-11.1c.
  const duplicate = (src: AdminAnswerSet) => {
    const copyName = `${src.name} (kópia)`;
    createSet.mutate(
      {
        name: copyName,
        description: src.description,
        categories: [...src.categories],
      },
      {
        onSuccess: (created) => {
          const newId = (created as { id: string }).id;
          const children = allAnswers.filter((a) => a.set_id === src.id);
          for (const a of children) {
            createAnswer.mutate(
              {
                set_id: newId,
                text: a.text,
                is_correct: a.is_correct,
                explanation: a.explanation,
              },
              { onError: onMutationError },
            );
          }
          toast.success(t("toast_duplicated", { name: copyName }));
        },
        onError: onMutationError,
      },
    );
  };

  const sets = useMemo(
    () =>
      allSets.filter((s) => (query ? s.name.toLowerCase().includes(query.toLowerCase()) : true)),
    [allSets, query],
  );

  return (
    <div data-testid="admin-answer-sets-root" className="space-y-6">
      <PageHeader
        testId="admin-answer-sets-header"
        title={t("page_title")}
        description={t("page_description")}
        actions={
          <Button size="sm" data-testid="answer-sets-list-new-button">
            <Plus className="mr-2 h-4 w-4" />
            {t("new_button")}
          </Button>
        }
      />

      <Card className="border-border/60 shadow-[var(--shadow-card)]">
        <CardContent className="p-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              data-testid="answer-sets-list-search"
              placeholder={t("search_placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {setsQuery.isLoading && <AdminListLoading testId="answer-sets-list-loading" />}
      {setsQuery.error && (
        <AdminListError error={setsQuery.error as Error} testId="answer-sets-list-error" />
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {!setsQuery.isLoading && sets.length === 0 && (
          <p
            data-testid="answer-sets-list-empty-state"
            className="col-span-full py-12 text-center text-sm text-muted-foreground"
          >
            {t("empty_state")}
          </p>
        )}
        {sets.map((s) => {
          const answers = allAnswers.filter((a) => a.set_id === s.id);
          const correct = answers.filter((a) => a.is_correct).length;
          const incorrect = answers.length - correct;
          const usage = allQuestions.filter((q) => q.answer_set_id === s.id).length;
          return (
            <Card
              key={s.id}
              data-testid={`answer-sets-list-row-${s.id}`}
              className="group flex flex-col border-border/60 shadow-[var(--shadow-card)] transition hover:border-primary/40"
            >
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Library className="h-4 w-4" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100"
                        data-testid={`answer-sets-row-menu-${s.id}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          to="/admin/answer-sets/$setId"
                          params={{ setId: s.id }}
                          data-testid={`answer-sets-row-open-${s.id}`}
                        >
                          {t("edit")}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        data-testid={`answer-sets-row-duplicate-${s.id}`}
                        onClick={() => duplicate(s)}
                      >
                        {t("duplicate")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        data-testid={`answer-sets-row-delete-${s.id}`}
                        onClick={() => setConfirmDelete(s)}
                      >
                        {t("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div>
                  <h3 className="font-semibold leading-tight text-foreground">{s.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {s.categories.map((c) => (
                    <Badge key={c} variant="secondary">
                      {branchLabel(c)}
                    </Badge>
                  ))}
                  <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20">
                    <Check className="mr-1 h-3 w-3" />
                    {t("correct_count", { count: correct })}
                  </Badge>
                  <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">
                    <X className="mr-1 h-3 w-3" />
                    {t("incorrect_count", { count: incorrect })}
                  </Badge>
                  <Badge variant="outline">{t("usage_count", { count: usage })}</Badge>
                </div>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link
                      to="/admin/answer-sets/$setId"
                      params={{ setId: s.id }}
                      data-testid={`answer-sets-row-edit-${s.id}`}
                    >
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      {t("edit")}
                    </Link>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/admin/answer-sets/$setId" params={{ setId: s.id }}>
                      {t("detail")}
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={t("confirm_delete_title")}
        description={
          confirmDelete ? t("confirm_delete_description", { name: confirmDelete.name }) : ""
        }
        confirmLabel={t("confirm_delete_button")}
        destructive
        onConfirm={() => {
          if (confirmDelete) {
            deleteSet.mutate(confirmDelete.id, {
              onSuccess: () => toast.success(t("toast_deleted")),
              onError: onMutationError,
            });
            setConfirmDelete(null);
          }
        }}
      />
    </div>
  );
}
