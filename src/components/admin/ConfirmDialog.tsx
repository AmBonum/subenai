import { type ReactNode } from "react";
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
import { tFor } from "@/i18n/app-shell";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
}: ConfirmDialogProps) {
  const t = tFor("confirm_dialog");
  const confirm = confirmLabel ?? t("confirm_default");
  const cancel = cancelLabel ?? t("cancel_default");
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="app-shell-confirm-dialog-root">
        <AlertDialogHeader>
          <AlertDialogTitle data-testid="app-shell-confirm-dialog-title">{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription data-testid="app-shell-confirm-dialog-description">
              {description}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="app-shell-confirm-dialog-cancel">
            {cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            data-testid="app-shell-confirm-dialog-confirm"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className={
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
