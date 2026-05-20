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
import { useDuplicateTemplate } from "@/lib/platform/queries";
import { tFor } from "@/i18n/tests";
import type { Template } from "@/lib/platform/types";

interface TemplateDuplicateDialogProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDuplicated?: () => void;
}

export function TemplateDuplicateDialog({
  template,
  open,
  onOpenChange,
  onDuplicated,
}: TemplateDuplicateDialogProps) {
  const t = tFor("templates");
  const duplicateMut = useDuplicateTemplate();
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (template && open) {
      setTitle(`${template.title}${t("dialogs.duplicate_suffix")}`);
    }
  }, [template, open, t]);

  if (!template) return null;

  const onConfirm = () => {
    const finalTitle = title.trim() || `${template.title}${t("dialogs.duplicate_suffix")}`;
    duplicateMut.mutate(
      { source: template, title: finalTitle },
      {
        onSuccess: () => {
          toast.success(t("dialogs.duplicate_success_toast"));
          onOpenChange(false);
          onDuplicated?.();
        },
        onError: () => {
          toast.error(t("dialogs.duplicate_error_toast"));
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="templates-duplicate-dialog">
        <DialogHeader>
          <DialogTitle>{t("dialogs.duplicate_title")}</DialogTitle>
          <DialogDescription>{t("dialogs.duplicate_description")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="templates-duplicate-dialog-title">
            {t("dialogs.duplicate_field_title_label")}
          </Label>
          <Input
            id="templates-duplicate-dialog-title"
            data-testid="templates-duplicate-dialog-title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="max-sm:h-11"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="templates-duplicate-dialog-cancel-button"
            className="max-sm:h-11"
          >
            {t("dialogs.duplicate_cancel_button")}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={duplicateMut.isPending}
            data-testid="templates-duplicate-dialog-duplicate-button"
            className="max-sm:h-11"
          >
            {t("dialogs.duplicate_confirm_button")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
