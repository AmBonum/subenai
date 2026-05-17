import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { ArrowLeft, ArrowRight, Check, Plus, Sparkles, Copy, X } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/page-header";
import { createTest, useGroups, useQuestions, useTemplates } from "@/lib/platform/mock-store";
import { tFor } from "@/i18n/tests";

const stepSchema = z.object({
  step: z.coerce.number().int().min(1).max(4).catch(1),
  templateId: z.string().optional(),
});

export const Route = createFileRoute("/app/tests/new")({
  validateSearch: stepSchema,
  head: () => ({
    meta: [{ title: "Nový test · SubenAI" }, { name: "robots", content: "noindex" }],
  }),
  component: WizardPage,
});

function WizardPage() {
  const t = tFor("wizard");
  const nav = useNavigate({ from: "/app/tests/new" });
  const search = useSearch({ from: "/app/tests/new" });
  const step = search.step ?? 1;
  const templates = useTemplates();
  const groups = useGroups();
  const questions = useQuestions();

  const initialFromTemplate = useMemo(() => {
    const tpl = templates.find((x) => x.id === search.templateId);
    return tpl
      ? { title: tpl.title, description: tpl.description ?? "", questionIds: tpl.question_ids }
      : null;
  }, [templates, search.templateId]);

  const [title, setTitle] = useState(initialFromTemplate?.title ?? "");
  const [description, setDescription] = useState(initialFromTemplate?.description ?? "");
  const [groupId, setGroupId] = useState<string>("none");
  const [questionIds, setQuestionIds] = useState<string[]>(initialFromTemplate?.questionIds ?? []);
  const [createdShareId, setCreatedShareId] = useState<string | null>(null);
  const [createdTestId, setCreatedTestId] = useState<string | null>(null);

  const goStep = (n: 1 | 2 | 3 | 4) =>
    nav({ search: (prev) => ({ ...prev, step: n }), replace: false });

  const step1Valid = title.trim().length > 0;
  const step3Valid = questionIds.length > 0;

  const onPublish = () => {
    const created = createTest({
      title: title.trim(),
      description: description.trim(),
      question_ids: questionIds,
      segmentation: groupId === "none" ? [] : [groupId],
    });
    setCreatedTestId(created.id);
    setCreatedShareId(created.share_id);
    goStep(4);
  };

  const shareUrl =
    createdShareId && typeof window !== "undefined"
      ? `${window.location.origin}/t/${createdShareId}`
      : createdShareId
        ? `/t/${createdShareId}`
        : "";

  const onCopy = () => {
    if (shareUrl && typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(shareUrl);
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
            <CardTitle>{t("step_1_title")}</CardTitle>
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
                <p className="text-xs text-destructive">{t("validation_title_required")}</p>
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
          <CardHeader>
            <CardTitle>{t("step_3_title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {questionIds.map((qid, idx) => {
              const q = questions.find((x) => x.id === qid);
              return (
                <div
                  key={qid}
                  className="flex items-start justify-between gap-2 rounded-md border p-3"
                  data-testid={`new-test-wizard-question-row-${idx}`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{q?.prompt ?? qid}</p>
                    {q && (
                      <p className="text-xs text-muted-foreground">
                        {q.type} · {q.category}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setQuestionIds(questionIds.filter((x) => x !== qid))}
                    aria-label={t("question_remove")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            {questionIds.length === 0 && (
              <p className="text-xs text-destructive">{t("validation_questions_required")}</p>
            )}
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const first = questions.find((q) => !questionIds.includes(q.id));
                  if (first) setQuestionIds([...questionIds, first.id]);
                }}
                data-testid="new-test-wizard-question-add-button"
              >
                <Plus className="mr-2 h-3 w-3" />
                {t("question_add_button")}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {questionIds.map((qid) => (
                <Badge key={qid} variant="secondary" className="text-[10px]">
                  {qid}
                </Badge>
              ))}
            </div>
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
                disabled={!step3Valid}
                data-testid="new-test-wizard-step-3-next"
              >
                {t("publish_button")}
                <Check className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
