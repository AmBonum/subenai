import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BRANCHES, type AdminAnswerSet, type AdminAnswer } from "@/lib/admin/mock-data";
import { CategoryMultiSelect } from "@/components/admin/CategoryMultiSelect";
import {
  useCreateAnswer,
  useCreateAnswerSet,
  useUpdateAnswer,
  useUpdateAnswerSet,
} from "@/lib/admin/queries";
import { tFor } from "@/i18n/questions";

export interface AnswerSetEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  set?: AdminAnswerSet | null;
  onSaved?: (set: AdminAnswerSet) => void;
}

const empty: { name: string; description: string; categories: string[] } = {
  name: "",
  description: "",
  categories: [BRANCHES[0].slug],
};

export function AnswerSetEditor({ open, onOpenChange, set, onSaved }: AnswerSetEditorProps) {
  const t = tFor("answer_set_editor");
  const createSet = useCreateAnswerSet();
  const updateSet = useUpdateAnswerSet();
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setForm(
        set
          ? { name: set.name, description: set.description, categories: [...set.categories] }
          : empty,
      );
    }
  }, [open, set]);

  const isEdit = Boolean(set);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError(t("error_name_required"));
      toast.error(t("error_name_required"));
      return;
    }
    if (form.categories.length === 0) {
      setError(t("error_branches_required"));
      toast.error(t("error_branches_required"));
      return;
    }
    setError(null);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      categories: form.categories,
    };
    const onError = (err: Error) => toast.error(err.message);
    if (isEdit && set) {
      updateSet.mutate(
        { id: set.id, patch: payload },
        {
          onSuccess: () => toast.success(t("toast_saved")),
          onError,
        },
      );
      onSaved?.({ ...set, ...form });
    } else {
      createSet.mutate(payload, {
        onSuccess: (created) => {
          toast.success(t("toast_created"));
          onSaved?.({
            id: (created as { id: string }).id,
            name: payload.name,
            description: payload.description,
            categories: payload.categories,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        },
        onError,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="answer-set-editor-dialog" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("title_edit") : t("title_new")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="as-name">{t("name_label")}</Label>
            <Input
              id="as-name"
              data-testid="answer-set-editor-title-input"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder={t("name_placeholder")}
              required
            />
            {error && (
              <p data-testid="answer-set-editor-error" className="text-xs text-destructive">
                {error}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t("branches_label")}</Label>
            <CategoryMultiSelect
              value={form.categories}
              onChange={(v) => setForm((f) => ({ ...f, categories: v }))}
            />
            <p className="text-xs text-muted-foreground">{t("branches_hint")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="as-desc">{t("description_label")}</Label>
            <Textarea
              id="as-desc"
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={t("description_placeholder")}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="answer-set-editor-cancel-button"
            >
              {t("cancel")}
            </Button>
            <Button type="submit" data-testid="answer-set-editor-save-button">
              {isEdit ? t("save_edit") : t("save_new")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export interface AnswerEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setId: string;
  initial?: AdminAnswer | null;
}

export function AnswerEditor({ open, onOpenChange, setId, initial }: AnswerEditorProps) {
  const t = tFor("answer_editor");
  const createAnswer = useCreateAnswer();
  const updateAnswer = useUpdateAnswer();
  const [text, setText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [isCorrect, setIsCorrect] = useState(true);

  useEffect(() => {
    if (open) {
      setText(initial?.text ?? "");
      setExplanation(initial?.explanation ?? "");
      setIsCorrect(initial?.is_correct ?? true);
    }
  }, [open, initial]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast.error(t("error_text_required"));
      return;
    }
    const onError = (err: Error) => toast.error(err.message);
    if (initial) {
      updateAnswer.mutate(
        {
          id: initial.id,
          patch: {
            text: text.trim(),
            is_correct: isCorrect,
            explanation: explanation.trim() || undefined,
          },
        },
        { onSuccess: () => toast.success(t("toast_saved")), onError },
      );
    } else {
      createAnswer.mutate(
        {
          set_id: setId,
          text: text.trim(),
          is_correct: isCorrect,
          explanation: explanation.trim() || undefined,
        },
        { onSuccess: () => toast.success(t("toast_created")), onError },
      );
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="answer-editor-dialog">
        <DialogHeader>
          <DialogTitle>{initial ? t("title_edit") : t("title_new")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("text_label")}</Label>
            <Textarea
              data-testid="answer-editor-text-input"
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("text_placeholder")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t("type_label")}</Label>
            <Select
              value={isCorrect ? "correct" : "incorrect"}
              onValueChange={(v) => setIsCorrect(v === "correct")}
            >
              <SelectTrigger data-testid="answer-editor-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="correct">{t("type_correct")}</SelectItem>
                <SelectItem value="incorrect">{t("type_incorrect")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("explanation_label")}</Label>
            <Textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder={t("explanation_placeholder")}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="answer-editor-cancel-button"
            >
              {t("cancel")}
            </Button>
            <Button type="submit" data-testid="answer-editor-save-button">
              {initial ? t("save_edit") : t("save_new")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
