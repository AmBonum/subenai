import { useRef } from "react";
import { toast } from "sonner";

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
import { useDeleteOwnTemplate } from "@/lib/platform/queries";
import { tFor } from "@/i18n/tests";
import type { Template } from "@/lib/platform/types";

interface TemplateDeleteConfirmProps {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateDeleteConfirm({
  template,
  open,
  onOpenChange,
}: TemplateDeleteConfirmProps) {
  const t = tFor("templates");
  const deleteMut = useDeleteOwnTemplate();
  const cancelRef = useRef<HTMLButtonElement>(null);

  if (!template) return null;

  const onConfirm = () => {
    deleteMut.mutate(template.id, {
      onSuccess: () => {
        toast.success(t("dialogs.delete_success_toast"));
        onOpenChange(false);
      },
      onError: () => {
        toast.error(
          <span data-testid="toast-templates-delete-error">{t("dialogs.delete_error_toast")}</span>,
        );
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        data-testid="templates-delete-dialog"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          cancelRef.current?.focus();
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{t("dialogs.delete_title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("dialogs.delete_description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            ref={cancelRef}
            data-testid="templates-delete-dialog-cancel-button"
            className="max-sm:h-11"
          >
            {t("dialogs.delete_cancel_button")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={deleteMut.isPending}
            data-testid="templates-delete-dialog-confirm-button"
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 max-sm:h-11"
          >
            {t("dialogs.delete_confirm_button")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
