import { useEffect, useMemo, useState } from "react";
import { Check, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminQuestion, QuestionStatus } from "@/lib/admin/types";
import { useAdminAnswerSets, useAdminAnswers } from "@/lib/admin/queries";
import { AiQuestionGenerator } from "@/components/admin/AiQuestionGenerator";
import { CategoryMultiSelect } from "@/components/admin/CategoryMultiSelect";
import { tFor } from "@/i18n/questions";

export interface QuestionEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  question?: AdminQuestion | null;
  onSave?: (data: Partial<AdminQuestion>) => void;
  aiEnabled?: boolean;
}

const empty = {
  title: "",
  excerpt: "",
  body: "",
  categories: [] as string[],
  status: "pending" as QuestionStatus,
  answer_set_id: "",
  correct_answer_ids: [] as string[],
  incorrect_answer_ids: [] as string[],
};

export function QuestionEditor({
  open,
  onOpenChange,
  question,
  onSave,
  aiEnabled = false,
}: QuestionEditorProps) {
  const t = tFor("question_editor");
  const answerSetsQuery = useAdminAnswerSets();
  const answersQuery = useAdminAnswers();
  const answerSets = useMemo(() => answerSetsQuery.data ?? [], [answerSetsQuery.data]);
  const allAnswers = useMemo(() => answersQuery.data ?? [], [answersQuery.data]);
  const [form, setForm] = useState(empty);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        question
          ? {
              title: question.title,
              excerpt: question.excerpt,
              body: question.body ?? "",
              categories: [...question.categories],
              status: question.status,
              answer_set_id: question.answer_set_id ?? answerSets[0]?.id ?? "",
              correct_answer_ids: [...question.correct_answer_ids],
              incorrect_answer_ids: [...question.incorrect_answer_ids],
            }
          : { ...empty, answer_set_id: answerSets[0]?.id ?? "" },
      );
    }
  }, [open, question, answerSets]);

  const isEdit = Boolean(question);

  const setAnswers = useMemo(
    () => (form.answer_set_id ? allAnswers.filter((a) => a.set_id === form.answer_set_id) : []),
    [form.answer_set_id, allAnswers],
  );
  const correctPool = setAnswers.filter((a) => a.is_correct);
  const incorrectPool = setAnswers.filter((a) => !a.is_correct);

  const toggleAnswer = (id: string, isCorrect: boolean) => {
    setForm((f) => {
      const key = isCorrect ? "correct_answer_ids" : "incorrect_answer_ids";
      const has = f[key].includes(id);
      return { ...f, [key]: has ? f[key].filter((x) => x !== id) : [...f[key], id] };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error(t("error_title_required"));
    if (form.correct_answer_ids.length === 0) return toast.error(t("error_correct_required"));
    if (form.incorrect_answer_ids.length < 2) return toast.error(t("error_incorrect_required"));
    onSave?.(form);
    toast.success(isEdit ? t("toast_saved") : t("toast_created"));
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          data-testid="question-editor-dialog"
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle data-testid="question-editor-title">
                  {isEdit ? t("title_edit") : t("title_new")}
                </DialogTitle>
                <DialogDescription>{t("description")}</DialogDescription>
              </div>
              {!isEdit && aiEnabled && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAiOpen(true)}
                  data-testid="question-editor-ai-button"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t("ai_generate_button")}
                </Button>
              )}
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="q-title">{t("field_title_label")}</Label>
              <Input
                id="q-title"
                data-testid="question-editor-title-input"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t("field_title_placeholder")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="q-excerpt">{t("field_excerpt_label")}</Label>
              <Input
                id="q-excerpt"
                data-testid="question-editor-excerpt-input"
                value={form.excerpt}
                onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                placeholder={t("field_excerpt_placeholder")}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("field_branches_label")}</Label>
                <CategoryMultiSelect
                  value={form.categories}
                  onChange={(v) => setForm((f) => ({ ...f, categories: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("field_status_label")}</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as QuestionStatus }))}
                >
                  <SelectTrigger data-testid="question-editor-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t("status_pending")}</SelectItem>
                    <SelectItem value="published">{t("status_published")}</SelectItem>
                    <SelectItem value="flagged">{t("status_flagged")}</SelectItem>
                    <SelectItem value="archived">{t("status_archived")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="q-body">{t("field_body_label")}</Label>
              <Textarea
                id="q-body"
                data-testid="question-editor-body-input"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder={t("field_body_placeholder")}
                rows={5}
              />
            </div>

            <div className="space-y-3 rounded-lg border border-border/60 p-3">
              <div className="flex items-center justify-between">
                <Label>{t("answers_label")}</Label>
                <Badge variant="secondary">
                  {t("answers_badge", {
                    correct: form.correct_answer_ids.length,
                    incorrect: form.incorrect_answer_ids.length,
                  })}
                </Badge>
              </div>
              <Select
                value={form.answer_set_id}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    answer_set_id: v,
                    correct_answer_ids: [],
                    incorrect_answer_ids: [],
                  }))
                }
              >
                <SelectTrigger data-testid="question-editor-answer-set-select">
                  <SelectValue placeholder={t("answers_set_placeholder")} />
                </SelectTrigger>
                <SelectContent>
                  {answerSets.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <p className="text-xs text-muted-foreground">{t("answers_hint")}</p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                    {t("correct_answers_label")}
                  </p>
                  <div className="space-y-1.5">
                    {correctPool.length === 0 && (
                      <p className="text-xs text-muted-foreground">{t("no_correct_in_set")}</p>
                    )}
                    {correctPool.map((a) => {
                      const checked = form.correct_answer_ids.includes(a.id);
                      return (
                        <label
                          key={a.id}
                          data-testid={`question-editor-correct-option-${a.id}`}
                          className="flex cursor-pointer items-start gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-2 text-sm hover:border-emerald-500/40"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleAnswer(a.id, true)}
                            className="mt-0.5"
                          />
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          <span>{a.text}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
                    {t("incorrect_answers_label")}
                  </p>
                  <div className="space-y-1.5">
                    {incorrectPool.length === 0 && (
                      <p className="text-xs text-muted-foreground">{t("no_incorrect_in_set")}</p>
                    )}
                    {incorrectPool.map((a) => {
                      const checked = form.incorrect_answer_ids.includes(a.id);
                      return (
                        <label
                          key={a.id}
                          data-testid={`question-editor-incorrect-option-${a.id}`}
                          className="flex cursor-pointer items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-2 text-sm hover:border-destructive/40"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleAnswer(a.id, false)}
                            className="mt-0.5"
                          />
                          <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                          <span>{a.text}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="question-editor-cancel-button"
              >
                {t("cancel")}
              </Button>
              <Button type="submit" data-testid="question-editor-save-button">
                {isEdit ? t("save_edit") : t("save_new")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {aiEnabled && (
        <AiQuestionGenerator
          open={aiOpen}
          onOpenChange={setAiOpen}
          defaultCategory={form.categories[0] ?? "vseobecny"}
          onAccept={(g, cat) =>
            setForm((f) => ({
              ...f,
              title: g.title,
              excerpt: g.excerpt,
              body: g.body,
              categories: f.categories.length ? f.categories : [cat],
            }))
          }
        />
      )}
    </>
  );
}
