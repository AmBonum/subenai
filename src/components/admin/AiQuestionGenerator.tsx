import { useState } from "react";
import { Sparkles, Loader2, Check, X } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRANCHES } from "@/lib/admin/mock-data";
import {
  generateQuestionWithAnswers,
  type GeneratedQuestion,
} from "@/lib/admin/ai-generate.functions";
import { tFor } from "@/i18n/questions";

export interface AiQuestionGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCategory?: string;
  onAccept?: (q: GeneratedQuestion, category: string) => void;
}

export function AiQuestionGenerator({
  open,
  onOpenChange,
  defaultCategory,
  onAccept,
}: AiQuestionGeneratorProps) {
  const t = tFor("ai_generator");
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState(defaultCategory ?? BRANCHES[0].slug);
  const [correctCount, setCorrectCount] = useState(3);
  const [incorrectCount, setIncorrectCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GeneratedQuestion | null>(null);

  const run = async () => {
    if (!topic.trim()) {
      toast.error(t("error_topic_required"));
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const out = await generateQuestionWithAnswers({
        topic: topic.trim(),
        category,
        correctCount,
        incorrectCount,
      });
      setResult(out);
      toast.success(t("toast_generated"));
    } catch (e) {
      toast.error((e as Error).message || t("error_generic"));
    } finally {
      setLoading(false);
    }
  };

  const accept = () => {
    if (!result) return;
    onAccept?.(result, category);
    onOpenChange(false);
    setResult(null);
    setTopic("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="ai-question-generator-dialog" className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("topic_label")}</Label>
            <Textarea
              data-testid="ai-question-generator-topic-input"
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={t("topic_placeholder")}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("branch_label")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger data-testid="ai-question-generator-branch-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANCHES.map((b) => (
                    <SelectItem key={b.slug} value={b.slug}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("correct_count_label")}</Label>
              <Input
                data-testid="ai-question-generator-correct-count-input"
                type="number"
                min={1}
                max={6}
                value={correctCount}
                onChange={(e) => setCorrectCount(Number(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("incorrect_count_label")}</Label>
              <Input
                data-testid="ai-question-generator-incorrect-count-input"
                type="number"
                min={1}
                max={8}
                value={incorrectCount}
                onChange={(e) => setIncorrectCount(Number(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={run}
              disabled={loading}
              data-testid="ai-question-generator-generate-button"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {loading ? t("generating_button") : t("generate_button")}
            </Button>
          </div>

          {result && (
            <div
              data-testid="ai-question-generator-result"
              className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4"
            >
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t("title_label")}
                </p>
                <p className="font-semibold text-foreground">{result.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{result.excerpt}</p>
              </div>
              <p className="text-sm text-foreground/80">{result.body}</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
                    {t("correct_label")}
                  </p>
                  {result.correct_answers.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-2 text-sm"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      <span>{a.text}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-destructive">
                    {t("incorrect_label")}
                  </p>
                  {result.incorrect_answers.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-sm"
                    >
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                      <span>{a.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="ai-question-generator-close-button"
          >
            {t("close")}
          </Button>
          <Button
            onClick={accept}
            disabled={!result}
            data-testid="ai-question-generator-accept-button"
          >
            {t("accept")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
