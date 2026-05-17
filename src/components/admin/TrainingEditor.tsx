import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
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
import { CategoryMultiSelect } from "@/components/admin/CategoryMultiSelect";
import {
  TRAINING_TOPICS,
  BRANCHES,
  type AdminTraining,
  type TrainingStatus,
} from "@/lib/admin/mock-data";
import { adminRepo } from "@/lib/admin/mock-store";
import { tFor } from "@/i18n/admin";

export interface TrainingEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  training?: AdminTraining | null;
  onSave?: (data: Partial<AdminTraining>) => void;
}

const emptyForm = () => ({
  title: "",
  description: "",
  topic: TRAINING_TOPICS[0].slug,
  branch: BRANCHES[0].slug,
  duration_min: 10,
  status: "draft" as TrainingStatus,
  topics: [] as string[],
  modules: [] as string[],
});

export function TrainingEditor({ open, onOpenChange, training, onSave }: TrainingEditorProps) {
  const t = tFor("trainings");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open) {
      setForm(
        training
          ? {
              title: training.title,
              description: training.description,
              topic: training.topic,
              branch: BRANCHES[0].slug,
              duration_min: training.duration_min,
              status: training.status,
              topics: [training.topic],
              modules: [],
            }
          : emptyForm(),
      );
    }
  }, [open, training]);

  const isEdit = Boolean(training);
  const titleTrimmed = form.title.trim();
  const canSave = titleTrimmed.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    if (isEdit && training) {
      adminRepo.trainings.update(training.id, {
        title: form.title,
        description: form.description,
        topic: form.topic,
        duration_min: form.duration_min,
        status: form.status,
      });
    } else {
      adminRepo.trainings.create({
        title: form.title,
        description: form.description,
        topic: form.topic,
        duration_min: form.duration_min,
        status: form.status,
      });
    }
    onSave?.(form);
    toast.success(isEdit ? "OK" : "OK");
    onOpenChange(false);
  };

  const addModule = () => setForm((f) => ({ ...f, modules: [...f.modules, ""] }));

  const removeModule = (idx: number) =>
    setForm((f) => ({ ...f, modules: f.modules.filter((_, i) => i !== idx) }));

  const updateModule = (idx: number, value: string) =>
    setForm((f) => ({
      ...f,
      modules: f.modules.map((m, i) => (i === idx ? value : m)),
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("edit") : t("new_button")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="t-title">{t("editor_title_label")}</Label>
            <Input
              id="t-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              data-testid="training-editor-title-input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="t-desc">{t("description")}</Label>
            <Textarea
              id="t-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("editor_status_label")}</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((f) => ({ ...f, status: v as TrainingStatus }))}
              >
                <SelectTrigger data-testid="training-editor-status-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">draft</SelectItem>
                  <SelectItem value="published">published</SelectItem>
                  <SelectItem value="archived">archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("editor_branch_label")}</Label>
              <Select
                value={form.branch}
                onValueChange={(v) => setForm((f) => ({ ...f, branch: v }))}
              >
                <SelectTrigger data-testid="training-editor-branch-select">
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
          </div>

          <div className="space-y-2">
            <Label>{t("editor_topic_label")}</Label>
            <div data-testid="training-editor-topic-multiselect">
              <CategoryMultiSelect
                value={form.topics}
                onChange={(next) => setForm((f) => ({ ...f, topics: next }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("editor_modules_title")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addModule}
                data-testid="training-editor-module-add-button"
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {t("editor_module_add")}
              </Button>
            </div>
            <div className="space-y-2">
              {form.modules.map((m, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2"
                  data-testid={`training-editor-module-row-${idx}`}
                >
                  <Input
                    value={m}
                    onChange={(e) => updateModule(idx, e.target.value)}
                    placeholder="Modul"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeModule(idx)}
                    data-testid={`training-editor-module-remove-${idx}`}
                    aria-label={t("editor_module_remove")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="training-editor-cancel-button"
            >
              {t("editor_cancel")}
            </Button>
            <Button type="submit" disabled={!canSave} data-testid="training-editor-save-button">
              {t("editor_save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
