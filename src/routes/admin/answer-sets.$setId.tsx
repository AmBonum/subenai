import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Check,
  X,
  Pencil,
  Trash2,
  MessageSquareText,
  Settings2,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/PageHeader";
import { AnswerEditor, AnswerSetEditor } from "@/components/admin/AnswerSetEditor";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  branchLabel,
  mockAnswerSets,
  questionsUsingAnswer,
  questionsUsingSet,
  type AdminAnswer,
} from "@/lib/admin/mock-data";
import {
  deleteAnswer,
  deleteSet,
  useAnswers,
  useAnswerSets,
} from "@/lib/admin/answer-sets-mock-store";
import { tFor } from "@/i18n/questions";

export const Route = createFileRoute("/admin/answer-sets/$setId")({
  component: AnswerSetDetailPage,
  notFoundComponent: () => <NotFoundFallback />,
  loader: ({ params }) => {
    const exists =
      mockAnswerSets.some((s) => s.id === params.setId) || params.setId.startsWith("as_");
    if (!exists) throw notFound();
    return { setId: params.setId };
  },
});

function NotFoundFallback() {
  const t = tFor("answer_set_editor");
  return (
    <div
      data-testid="answer-set-detail-not-found"
      className="p-8 text-center text-muted-foreground"
    >
      {t("not_found_title")}{" "}
      <Link
        to="/admin/answer-sets"
        className="text-primary underline"
        data-testid="answer-set-editor-back-link"
      >
        {t("back_to_list")}
      </Link>
    </div>
  );
}

function AnswerSetDetailPage() {
  const t = tFor("answer_set_editor");
  const { setId } = Route.useLoaderData();
  const router = useRouter();
  const sets = useAnswerSets();
  const allAnswers = useAnswers();

  const set = useMemo(() => sets.find((s) => s.id === setId), [sets, setId]);
  const answers = useMemo(() => allAnswers.filter((a) => a.set_id === setId), [allAnswers, setId]);

  const [answerEditorOpen, setAnswerEditorOpen] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState<AdminAnswer | null>(null);
  const [setEditorOpen, setSetEditorOpen] = useState(false);
  const [confirmDeleteAnswer, setConfirmDeleteAnswer] = useState<AdminAnswer | null>(null);
  const [confirmDeleteSet, setConfirmDeleteSet] = useState(false);

  if (!set) {
    return (
      <div
        data-testid="answer-set-detail-not-found"
        className="p-8 text-center text-muted-foreground"
      >
        {t("not_found_removed")}{" "}
        <Link to="/admin/answer-sets" className="text-primary underline">
          {t("back_to_list")}
        </Link>
      </div>
    );
  }

  const correct = answers.filter((a) => a.is_correct);
  const incorrect = answers.filter((a) => !a.is_correct);
  const linkedQuestions = questionsUsingSet(set.id);

  const openCreate = () => {
    setEditingAnswer(null);
    setAnswerEditorOpen(true);
  };
  const openEdit = (a: AdminAnswer) => {
    setEditingAnswer(a);
    setAnswerEditorOpen(true);
  };

  return (
    <div data-testid="answer-set-editor-root" className="space-y-6">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-2 -ml-2"
          data-testid="answer-set-editor-back-button"
        >
          <Link to="/admin/answer-sets">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {t("page_back")}
          </Link>
        </Button>
        <PageHeader
          testId="answer-set-editor-header"
          title={set.name}
          description={set.description}
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSetEditorOpen(true)}
                data-testid="answer-set-editor-edit-meta-button"
              >
                <Settings2 className="mr-2 h-4 w-4" />
                {t("edit_set_button")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirmDeleteSet(true)}
                data-testid="answer-set-editor-delete-set-button"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("delete_set_button")}
              </Button>
              <Button
                size="sm"
                onClick={openCreate}
                data-testid="answer-set-editor-add-answer-button"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("add_answer_button")}
              </Button>
            </>
          }
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {set.categories.map((c) => (
            <Badge key={c} variant="secondary">
              {branchLabel(c)}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <AnswerColumn
          tone="correct"
          title={t("correct_column_title")}
          answers={correct}
          onEdit={openEdit}
          onDelete={setConfirmDeleteAnswer}
        />
        <AnswerColumn
          tone="incorrect"
          title={t("incorrect_column_title")}
          answers={incorrect}
          onEdit={openEdit}
          onDelete={setConfirmDeleteAnswer}
        />
      </div>

      <Card className="border-border/60 shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">{t("usage_card_title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {linkedQuestions.length === 0 ? (
            <p
              data-testid="answer-set-editor-usage-empty"
              className="text-sm text-muted-foreground"
            >
              {t("usage_empty")}
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {linkedQuestions.map((q) => (
                <div
                  key={q.id}
                  className="flex items-start justify-between gap-3 py-3"
                  data-testid={`answer-set-editor-question-${q.id}`}
                >
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-medium text-foreground">{q.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {q.categories.map(branchLabel).join(", ")}
                    </p>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    data-testid="answer-set-editor-questions-link"
                  >
                    <Link to="/admin/questions">
                      <MessageSquareText className="mr-1.5 h-3.5 w-3.5" />
                      {t("questions_open")}
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AnswerEditor
        open={answerEditorOpen}
        onOpenChange={setAnswerEditorOpen}
        setId={set.id}
        initial={editingAnswer}
      />

      <AnswerSetEditor open={setEditorOpen} onOpenChange={setSetEditorOpen} set={set} />

      <ConfirmDialog
        open={!!confirmDeleteAnswer}
        onOpenChange={(o) => !o && setConfirmDeleteAnswer(null)}
        title={t("confirm_delete_answer_title")}
        description={
          confirmDeleteAnswer
            ? t("confirm_delete_answer_description", { text: confirmDeleteAnswer.text })
            : ""
        }
        confirmLabel={t("confirm_delete_answer_button")}
        destructive
        onConfirm={() => {
          if (confirmDeleteAnswer) {
            deleteAnswer(confirmDeleteAnswer.id);
            toast.success(t("toast_answer_deleted"));
            setConfirmDeleteAnswer(null);
          }
        }}
      />

      <ConfirmDialog
        open={confirmDeleteSet}
        onOpenChange={setConfirmDeleteSet}
        title={t("confirm_delete_set_title")}
        description={t("confirm_delete_set_description", { name: set.name })}
        confirmLabel={t("confirm_delete_set_button")}
        destructive
        onConfirm={() => {
          deleteSet(set.id);
          toast.success(t("toast_set_deleted"));
          router.navigate({ to: "/admin/answer-sets" });
        }}
      />
    </div>
  );
}

function AnswerColumn({
  tone,
  title,
  answers,
  onEdit,
  onDelete,
}: {
  tone: "correct" | "incorrect";
  title: string;
  answers: AdminAnswer[];
  onEdit: (a: AdminAnswer) => void;
  onDelete: (a: AdminAnswer) => void;
}) {
  const t = tFor("answer_set_editor");
  const Icon = tone === "correct" ? Check : X;
  const accent =
    tone === "correct"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : "border-destructive/30 bg-destructive/5";
  const iconColor = tone === "correct" ? "text-emerald-600" : "text-destructive";
  const columnTestId =
    tone === "correct" ? "answer-set-editor-correct-column" : "answer-set-editor-incorrect-column";
  const addButtonTestId =
    tone === "correct"
      ? "answer-set-editor-correct-add-button"
      : "answer-set-editor-incorrect-add-button";

  return (
    <Card data-testid={columnTestId} className="border-border/60 shadow-[var(--shadow-card)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          {title}
          <Badge variant="secondary" className="ml-auto">
            {answers.length}
          </Badge>
          <Button
            data-testid={addButtonTestId}
            size="sm"
            variant="ghost"
            className="ml-1"
            aria-label={tone === "correct" ? t("row_correct_add") : t("row_incorrect_add")}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {answers.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("empty_column")}</p>
        )}
        {answers.map((a, idx) => {
          const usage = questionsUsingAnswer(a.id);
          const rowTestId =
            tone === "correct"
              ? `answer-set-editor-correct-row-${idx}`
              : `answer-set-editor-incorrect-row-${idx}`;
          const inputTestId =
            tone === "correct"
              ? `answer-set-editor-correct-row-input-${idx}`
              : `answer-set-editor-incorrect-row-input-${idx}`;
          const deleteTestId =
            tone === "correct"
              ? `answer-set-editor-correct-row-delete-${idx}`
              : `answer-set-editor-incorrect-row-delete-${idx}`;
          return (
            <div
              key={a.id}
              data-testid={rowTestId}
              className={`group rounded-lg border p-3 ${accent}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${iconColor}`} />
                <div className="min-w-0 flex-1">
                  <p data-testid={inputTestId} className="text-sm text-foreground">
                    {a.text}
                  </p>
                  {a.explanation && (
                    <p className="mt-1 text-xs text-muted-foreground">{a.explanation}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {usage.length}
                    </Badge>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(a)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => onDelete(a)}
                    data-testid={deleteTestId}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
