import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tFor } from "@/i18n/app-shell";

/**
 * Severity drives the icon + confirm-button colour so the user instantly
 * sees how dangerous the action is. Mapping:
 *
 *   - `info`        — blue Info icon, neutral confirm button
 *                     (use for "this will publish a public asset" type prompts
 *                     that are reversible but worth a sanity check)
 *   - `warning`     — amber AlertTriangle, amber confirm button
 *                     (use for "you're about to override something the user
 *                     filled in" — reversible but loud)
 *   - `destructive` — red ShieldAlert icon + destructive confirm button
 *                     (use for delete / anonymise / wipe — irreversible)
 *   - `success`     — green CheckCircle2, primary confirm button
 *                     (use for approve / mark-resolved — positive, terminal)
 *
 * CLAUDE.md rule "No default browser modals" forbids `window.confirm`,
 * `window.alert`, `window.prompt`. ALL confirmation flows go through
 * this component (or shadcn `Dialog` if the body needs a form).
 */
export type ConfirmDialogSeverity = "info" | "warning" | "destructive" | "success";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  severity?: ConfirmDialogSeverity;
  /**
   * @deprecated — pass `severity="destructive"` instead. Kept for
   * back-compat with the original AH-10 ConfirmDialog API.
   */
  destructive?: boolean;
  /**
   * Optional typed-confirm gate. The confirm button stays disabled
   * until the user types `expected` into the input EXACTLY. Use this
   * for irreversible operations on PII (e.g. hard-delete a user where
   * the admin must type the target email).
   */
  typedConfirm?: {
    expected: string;
    label: string;
    placeholder?: string;
  };
  onConfirm: () => void;
}

const SEVERITY_META: Record<
  ConfirmDialogSeverity,
  {
    Icon: typeof AlertTriangle;
    iconClass: string;
    confirmButtonClass: string;
  }
> = {
  info: {
    Icon: Info,
    iconClass: "text-sky-500",
    confirmButtonClass: "",
  },
  warning: {
    Icon: AlertTriangle,
    iconClass: "text-amber-500",
    confirmButtonClass:
      "bg-amber-500 text-amber-50 hover:bg-amber-500/90 focus-visible:ring-amber-500",
  },
  destructive: {
    Icon: ShieldAlert,
    iconClass: "text-destructive",
    confirmButtonClass: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
  success: {
    Icon: CheckCircle2,
    iconClass: "text-emerald-500",
    confirmButtonClass:
      "bg-emerald-600 text-emerald-50 hover:bg-emerald-600/90 focus-visible:ring-emerald-500",
  },
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  severity,
  destructive,
  typedConfirm,
  onConfirm,
}: ConfirmDialogProps) {
  const t = tFor("confirm_dialog");
  // Back-compat: legacy `destructive` prop maps to severity="destructive"
  // unless severity was set explicitly.
  const resolvedSeverity: ConfirmDialogSeverity =
    severity ?? (destructive ? "destructive" : "info");
  const meta = SEVERITY_META[resolvedSeverity];
  const Icon = meta.Icon;
  const confirm = confirmLabel ?? t("confirm_default");
  const cancel = cancelLabel ?? t("cancel_default");

  const [typed, setTyped] = useState("");
  // Reset the typed value every time the dialog opens — otherwise a
  // previous match would survive a close+reopen cycle and let the
  // admin confirm a new target without re-typing.
  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  const typedMismatch = typedConfirm
    ? typed.trim() === "" || typed.trim() !== typedConfirm.expected
    : false;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        data-testid="app-shell-confirm-dialog-root"
        data-severity={resolvedSeverity}
      >
        <AlertDialogHeader>
          <AlertDialogTitle
            data-testid="app-shell-confirm-dialog-title"
            className="flex items-start gap-2"
          >
            <Icon
              className={`mt-0.5 size-5 shrink-0 ${meta.iconClass}`}
              data-testid={`app-shell-confirm-dialog-icon-${resolvedSeverity}`}
              aria-hidden="true"
            />
            <span>{title}</span>
          </AlertDialogTitle>
          {description ? (
            <AlertDialogDescription data-testid="app-shell-confirm-dialog-description">
              {description}
            </AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>

        {typedConfirm ? (
          <div className="space-y-2 pt-1">
            <Label htmlFor="confirm-dialog-typed-input">{typedConfirm.label}</Label>
            <Input
              id="confirm-dialog-typed-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={typedConfirm.placeholder ?? typedConfirm.expected}
              autoComplete="off"
              data-testid="app-shell-confirm-dialog-typed-input"
            />
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel data-testid="app-shell-confirm-dialog-cancel">
            {cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            data-testid="app-shell-confirm-dialog-confirm"
            disabled={typedMismatch}
            onClick={() => {
              if (typedMismatch) return;
              onConfirm();
              onOpenChange(false);
            }}
            className={meta.confirmButtonClass || undefined}
          >
            {confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
