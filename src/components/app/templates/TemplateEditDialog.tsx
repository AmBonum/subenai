import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useUpdateOwnTemplate } from "@/lib/platform/queries";
import { tFor } from "@/i18n/tests";
import type { GdprPurpose, Template, TemplateAgeRating } from "@/lib/platform/types";

const TITLE_MAX = 80;
const DESCRIPTION_MAX = 400;

const PURPOSES: GdprPurpose[] = [
  "marketing",
  "research",
  "recruitment",
  "education",
  "internal_training",
];

const AGE_RATINGS: TemplateAgeRating[] = ["all", "thirteen_plus", "sixteen_plus", "eighteen_plus"];

interface TemplateEditDialogProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateEditDialog({ template, open, onOpenChange }: TemplateEditDialogProps) {
  const t = tFor("templates");
  const updateMut = useUpdateOwnTemplate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState<GdprPurpose>("research");
  const [ageRating, setAgeRating] = useState<TemplateAgeRating>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (template && open) {
      setTitle(template.title);
      setDescription(template.description);
      setPurpose(template.gdpr_purpose);
      setAgeRating(template.age_rating);
      setError(null);
    }
  }, [template, open]);

  if (!template) return null;

  const validate = (): string | null => {
    const trimmed = title.trim();
    if (!trimmed) return t("dialogs.edit_error_title_required");
    if (trimmed.length > TITLE_MAX) return t("dialogs.edit_error_title_max");
    if (description.length > DESCRIPTION_MAX) return t("dialogs.edit_error_description_max");
    return null;
  };

  const onSave = () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    updateMut.mutate(
      {
        id: template.id,
        patch: {
          title: title.trim(),
          description,
          gdpr_purpose: purpose,
          age_rating: ageRating,
        },
      },
      {
        onSuccess: () => {
          toast.success(t("dialogs.edit_success_toast"));
          onOpenChange(false);
        },
        onError: () => {
          toast.error(t("dialogs.edit_error_toast"));
        },
      },
    );
  };

  const descCount = t("dialogs.edit_character_count", {
    count: description.length,
    max: DESCRIPTION_MAX,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="templates-edit-dialog">
        <DialogHeader>
          <DialogTitle>{t("dialogs.edit_title")}</DialogTitle>
          <DialogDescription>{t("dialogs.edit_description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="templates-edit-dialog-title">
              {t("dialogs.edit_field_title_label")}
            </Label>
            <Input
              id="templates-edit-dialog-title"
              data-testid="templates-edit-dialog-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("dialogs.edit_field_title_placeholder")}
              maxLength={TITLE_MAX + 10}
              autoFocus
              aria-invalid={!!error}
              className="max-sm:h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="templates-edit-dialog-description">
              {t("dialogs.edit_field_description_label")}
            </Label>
            <Textarea
              id="templates-edit-dialog-description"
              data-testid="templates-edit-dialog-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("dialogs.edit_field_description_placeholder")}
              rows={3}
              maxLength={DESCRIPTION_MAX + 50}
            />
            <p className="text-right text-[10px] text-muted-foreground tabular-nums">{descCount}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="templates-edit-dialog-purpose">
                {t("dialogs.edit_field_purpose_label")}
              </Label>
              <Select value={purpose} onValueChange={(v) => setPurpose(v as GdprPurpose)}>
                <SelectTrigger
                  id="templates-edit-dialog-purpose"
                  data-testid="templates-edit-dialog-purpose-select"
                  className="max-sm:h-11"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURPOSES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {t(`purposes.${p}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="templates-edit-dialog-age">{t("dialogs.edit_field_age_label")}</Label>
              <Select value={ageRating} onValueChange={(v) => setAgeRating(v as TemplateAgeRating)}>
                <SelectTrigger
                  id="templates-edit-dialog-age"
                  data-testid="templates-edit-dialog-age-select"
                  className="max-sm:h-11"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGE_RATINGS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {t(`age_options.${a}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="rounded-md border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
            {t("dialogs.edit_questions_note")}
          </p>
          {error && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="templates-edit-dialog-cancel-button"
            className="max-sm:h-11"
          >
            {t("dialogs.edit_cancel_button")}
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={updateMut.isPending}
            data-testid="templates-edit-dialog-save-button"
            className="max-sm:h-11"
          >
            {t("dialogs.edit_save_button")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
