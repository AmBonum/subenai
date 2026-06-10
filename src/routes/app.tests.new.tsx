import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Plus,
  Sparkles,
  Sparkle,
  Copy,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/page-header";
import { QuestionPickerDialog } from "@/components/app/tests/QuestionPickerDialog";
import { toast } from "sonner";
import {
  useAudiences,
  useCreateTest,
  useCurrentProfile,
  useLibraryQuestions,
  useTemplates,
} from "@/lib/platform/queries";
import { copyToClipboard } from "@/lib/browser/clipboard";
import { tFor } from "@/i18n/tests";
import { tFor as tAppShell } from "@/i18n/app-shell";

const MAX_QUESTIONS_PER_TEST = 100;

const tRoutes = tAppShell("route_titles");

const stepSchema = z.object({
  step: z.coerce.number().int().min(1).max(4).catch(1),
  templateId: z.string().optional(),
});

export const Route = createFileRoute("/app/tests/new")({
  validateSearch: stepSchema,
  head: () => ({
    meta: [{ title: tRoutes("tests_new") }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: WizardPage,
});

function WizardPage() {
  const t = tFor("wizard");
  const nav = useNavigate({ from: "/app/tests/new" });
  const search = useSearch({ from: "/app/tests/new" });
  const step = search.step ?? 1;
  const templatesQ = useTemplates();
  const groupsQ = useAudiences();
  const profileQ = useCurrentProfile();
  const createMut = useCreateTest();
  const templates = useMemo(() => templatesQ.data ?? [], [templatesQ.data]);
  const groups = groupsQ.data ?? [];
  const libraryQ = useLibraryQuestions();
  const libraryQuestions = useMemo(() => libraryQ.data ?? [], [libraryQ.data]);
  const libraryById = useMemo(() => {
    const m = new Map<string, (typeof libraryQuestions)[number]>();
    for (const q of libraryQuestions) m.set(q.id, q);
    return m;
  }, [libraryQuestions]);

  const sourceTemplate = useMemo(
    () => templates.find((x) => x.id === search.templateId) ?? null,
    [templates, search.templateId],
  );
  const templateQuestionIds = useMemo(
    () => new Set(sourceTemplate?.question_ids ?? []),
    [sourceTemplate],
  );

  const initialFromTemplate = useMemo(
    () =>
      sourceTemplate
        ? {
            title: sourceTemplate.title,
            description: sourceTemplate.description ?? "",
            questionIds: sourceTemplate.question_ids,
          }
        : null,
    [sourceTemplate],
  );

  const [title, setTitle] = useState(initialFromTemplate?.title ?? "");
  const [description, setDescription] = useState(initialFromTemplate?.description ?? "");
  const [groupId, setGroupId] = useState<string>("none");
  const [questionIds, setQuestionIds] = useState<string[]>(initialFromTemplate?.questionIds ?? []);
  const [createdShareId, setCreatedShareId] = useState<string | null>(null);
  const [createdTestId, setCreatedTestId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  // Deep-link/refresh: templates resolve async, so the useState
  // initializers above see no template on first render. Prefill once when
  // the template arrives — only while the form is still pristine so a
  // slow response never clobbers user input.
  const templatePrefillDone = useRef(initialFromTemplate !== null);
  useEffect(() => {
    if (!initialFromTemplate || templatePrefillDone.current) return;
    templatePrefillDone.current = true;
    if (title === "" && description === "" && questionIds.length === 0) {
      setTitle(initialFromTemplate.title);
      setDescription(initialFromTemplate.description);
      setQuestionIds(initialFromTemplate.questionIds);
    }
  }, [initialFromTemplate, title, description, questionIds]);

  const remainingCapacity = Math.max(0, MAX_QUESTIONS_PER_TEST - questionIds.length);

  const goStep = (n: 1 | 2 | 3 | 4) =>
    nav({ search: (prev: Record<string, unknown>) => ({ ...prev, step: n }), replace: false });

  const step1Valid = title.trim().length > 0;
  const step3Valid = questionIds.length > 0;

  function moveQuestion(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= questionIds.length) return;
    const next = [...questionIds];
    [next[index], next[target]] = [next[target], next[index]];
    setQuestionIds(next);
  }

  function removeQuestion(id: string) {
    setQuestionIds((prev) => prev.filter((x) => x !== id));
  }

  function addQuestions(ids: string[]) {
    setQuestionIds((prev) => {
      const next = [...prev];
      const seen = new Set(prev);
      for (const id of ids) {
        if (!seen.has(id)) {
          next.push(id);
          seen.add(id);
        }
      }
      return next;
    });
  }

  function clearAllQuestions() {
    setQuestionIds([]);
    setClearConfirmOpen(false);
  }

  const onPublish = () => {
    const ownerId = profileQ.data?.id;
    if (!ownerId) return;
    createMut.mutate(
      {
        owner_id: ownerId,
        title: title.trim(),
        description: description.trim(),
        segmentation: groupId === "none" ? [] : [groupId],
        question_ids: questionIds,
      },
      {
        onSuccess: (created) => {
          const row = created as { id: string; share_id: string } | null;
          if (!row) return;
          setCreatedTestId(row.id);
          setCreatedShareId(row.share_id);
          goStep(4);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const shareUrl =
    createdShareId && typeof window !== "undefined"
      ? `${window.location.origin}/t/${createdShareId}`
      : createdShareId
        ? `/t/${createdShareId}`
        : "";

  const onCopy = () => {
    if (shareUrl) {
      void copyToClipboard(shareUrl);
    }
  };

  const onFinish = () => {
    if (createdTestId) {
      nav({ to: "/app/tests/$testId", params: { testId: createdTestId } });
    }
  };

  return (
    <div className="space-y-6" data-testid="new-test-wizard-root">
      <PageHeader
        eyebrow={t("page_eyebrow")}
        title={t("page_title")}
        accentWords={1}
        subtitle={t("page_subtitle")}
      />

      <div
        className="flex items-center gap-2 text-sm text-muted-foreground"
        data-testid="new-test-wizard-progress"
      >
        <Sparkles className="h-4 w-4" />
        <span>{t("step_label", { n: step })}</span>
        <div className="flex flex-1 gap-1">
          {[1, 2, 3, 4].map((s) => (
            <span
              key={s}
              className={`h-1 flex-1 rounded ${s <= step ? "bg-primary" : "bg-muted"}`}
              data-testid={`new-test-wizard-progress-bar-${s}`}
            />
          ))}
        </div>
      </div>

      {step === 1 && (
        <Card data-testid="new-test-wizard-step-1-root">
          <CardHeader>
            <CardTitle data-testid="new-test-wizard-step-1-title">{t("step_1_title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wiz-title">{t("title_input_label")}</Label>
              <Input
                id="wiz-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("title_input_placeholder")}
                data-testid="new-test-wizard-title-input"
              />
              {!step1Valid && title.length > 0 && (
                <p
                  className="text-xs text-destructive"
                  data-testid="new-test-wizard-validation-title"
                >
                  {t("validation_title_required")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="wiz-desc">{t("description_input_label")}</Label>
              <Textarea
                id="wiz-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("description_input_placeholder")}
                data-testid="new-test-wizard-description-input"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => goStep(2)}
                disabled={!step1Valid}
                data-testid="new-test-wizard-step-1-next"
              >
                {t("next_button")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card data-testid="new-test-wizard-step-2-root">
          <CardHeader>
            <CardTitle>{t("step_2_title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("audience_select_label")}</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger data-testid="new-test-wizard-audience-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("audience_none")}</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => goStep(1)}
                data-testid="new-test-wizard-step-2-back"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("back_button")}
              </Button>
              <Button onClick={() => goStep(3)} data-testid="new-test-wizard-step-2-next">
                {t("next_button")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card data-testid="new-test-wizard-step-3-root">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
            <div className="min-w-0">
              <CardTitle data-testid="new-test-wizard-step-3-title">{t("step_3_title")}</CardTitle>
              {sourceTemplate && (
                <p
                  className="mt-1 text-xs text-muted-foreground"
                  data-testid="new-test-wizard-step-3-template-source"
                >
                  <Sparkle className="mr-1 inline h-3 w-3 align-text-bottom text-primary" />
                  {t("questions_from_template_badge")}: {sourceTemplate.title}
                </p>
              )}
            </div>
            <Badge
              variant={questionIds.length >= MAX_QUESTIONS_PER_TEST ? "destructive" : "secondary"}
              className="shrink-0"
              data-testid="new-test-wizard-step-3-counter"
            >
              {t("questions_counter", {
                count: questionIds.length,
                max: MAX_QUESTIONS_PER_TEST,
              })}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {questionIds.length === 0 ? (
              <div
                className="rounded-md border border-dashed border-border/60 p-6 text-center"
                data-testid="new-test-wizard-step-3-empty-state"
              >
                <p className="text-sm font-medium text-foreground">{t("questions_empty_title")}</p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                  {t("questions_empty_body")}
                </p>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setPickerOpen(true)}
                  className="mt-4"
                  data-testid="new-test-wizard-step-3-empty-cta"
                >
                  <Plus className="mr-2 h-3 w-3" aria-hidden />
                  {t("questions_empty_cta")}
                </Button>
                <p
                  className="mt-3 text-xs text-destructive"
                  data-testid="new-test-wizard-validation-questions"
                >
                  {t("validation_questions_required")}
                </p>
              </div>
            ) : (
              <ul className="space-y-2" data-testid="new-test-wizard-step-3-questions-list">
                {questionIds.map((qid, idx) => {
                  const q = libraryById.get(qid);
                  const isFirst = idx === 0;
                  const isLast = idx === questionIds.length - 1;
                  const fromTemplate = templateQuestionIds.has(qid);
                  return (
                    <li
                      key={qid}
                      className="flex items-start gap-2 rounded-md border border-border/60 bg-card p-3"
                      data-testid={`new-test-wizard-question-row-${idx}`}
                    >
                      <span
                        className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground"
                        aria-hidden
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-medium leading-snug"
                          data-testid={`new-test-wizard-question-row-${idx}-prompt`}
                        >
                          {q?.prompt ?? t("questions_unknown_prompt")}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {fromTemplate && (
                            <Badge
                              variant="outline"
                              className="border-primary/40 text-[10px] text-primary"
                              data-testid={`new-test-wizard-question-row-${idx}-template-badge`}
                            >
                              <Sparkle className="mr-1 h-2.5 w-2.5" aria-hidden />
                              {t("questions_from_template_badge")}
                            </Badge>
                          )}
                          {q?.branch_slug && (
                            <Badge variant="outline" className="text-[10px]">
                              {q.branch_slug}
                            </Badge>
                          )}
                          {q?.difficulty && (
                            <Badge variant="secondary" className="text-[10px]">
                              {q.difficulty}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => moveQuestion(idx, -1)}
                          disabled={isFirst}
                          aria-label={t("question_move_up")}
                          data-testid={`new-test-wizard-question-row-${idx}-up`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => moveQuestion(idx, 1)}
                          disabled={isLast}
                          aria-label={t("question_move_down")}
                          data-testid={`new-test-wizard-question-row-${idx}-down`}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeQuestion(qid)}
                          aria-label={t("question_remove")}
                          data-testid={`new-test-wizard-question-row-${idx}-remove`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {questionIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPickerOpen(true)}
                  disabled={remainingCapacity === 0}
                  data-testid="new-test-wizard-question-add-button"
                >
                  <Plus className="mr-2 h-3 w-3" aria-hidden />
                  {t("question_add_button")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setClearConfirmOpen(true)}
                  data-testid="new-test-wizard-question-clear-all-button"
                >
                  <Trash2 className="mr-2 h-3 w-3" aria-hidden />
                  {t("questions_clear_all")}
                </Button>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() => goStep(2)}
                data-testid="new-test-wizard-step-3-back"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("back_button")}
              </Button>
              <Button
                onClick={onPublish}
                disabled={!step3Valid || createMut.isPending || !profileQ.data}
                data-testid="new-test-wizard-step-3-next"
              >
                {t("publish_button")}
                <Check className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <QuestionPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        excludeIds={questionIds}
        onAdd={addQuestions}
        remainingCapacity={remainingCapacity}
      />

      <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <AlertDialogContent data-testid="new-test-wizard-clear-all-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("questions_clear_all")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("questions_clear_all_confirm", { count: questionIds.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="new-test-wizard-clear-all-cancel">
              {t("back_button")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={clearAllQuestions}
              data-testid="new-test-wizard-clear-all-confirm-button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("questions_clear_all")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {step === 4 && (
        <Card data-testid="new-test-wizard-step-4-root">
          <CardHeader>
            <CardTitle>{t("step_4_title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wiz-share">{t("share_link_label")}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="wiz-share"
                  readOnly
                  value={shareUrl}
                  data-testid="new-test-wizard-share-link-input"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCopy}
                  data-testid="new-test-wizard-share-copy-button"
                >
                  <Copy className="mr-2 h-3 w-3" />
                  {t("share_copy_button")}
                </Button>
              </div>
            </div>
            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => goStep(3)}
                data-testid="new-test-wizard-step-4-back"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("back_button")}
              </Button>
              <Button onClick={onFinish} data-testid="new-test-wizard-publish-button">
                {t("publish_button")}
                <Check className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
