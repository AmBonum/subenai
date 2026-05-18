// AH-12.4 — backup codes UI primitive.
//
// Shared between /login/enroll-2fa (initial generation, mid-wizard) and
// /app/account/security (regenerate from settings). Encapsulates:
//   - "Remaining codes" count + zero-state warning ("Vygenerujte nové
//     záložné kódy").
//   - Regenerate flow with a confirm dialog (old codes invalidated).
//   - One-shot display of new plaintext codes with copy + download.

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { generateBackupCodes, remainingBackupCodes } from "@/lib/auth/mfa";
import { tFor } from "@/i18n/security";

export function BackupCodesManager() {
  const t = tFor("security_card");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    remainingBackupCodes().then(setRemaining);
  }, []);

  const onRegenerate = async () => {
    setBusy(true);
    try {
      const codes = await generateBackupCodes();
      setNewCodes(codes);
      setRemaining(codes.length);
      toast.success(t("toast_regenerated"));
    } catch {
      toast.error("Error");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!newCodes) return;
    await navigator.clipboard.writeText(newCodes.join("\n")).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    if (!newCodes) return;
    const blob = new Blob([newCodes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subenai-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="backup-codes-manager">
      <h3 className="mb-1 font-medium" data-testid="backup-codes-title">
        {t("backup_codes_title")}
      </h3>
      {remaining === 0 ? (
        <p
          className="flex items-center gap-1 text-sm text-destructive"
          data-testid="backup-codes-warning-none"
        >
          <AlertTriangle className="h-4 w-4" />
          {t("backup_codes_none_warning")}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground" data-testid="backup-codes-remaining">
          {t("backup_codes_remaining", { count: remaining ?? 0 })}
        </p>
      )}

      {newCodes && (
        <div className="mt-3" data-testid="backup-codes-fresh-block">
          <ul
            className="grid grid-cols-2 gap-2 rounded bg-muted p-3 font-mono text-sm"
            data-testid="backup-codes-fresh-list"
          >
            {newCodes.map((c) => (
              <li key={c} data-testid={`backup-codes-fresh-${c}`}>
                {c}
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={copy}
              data-testid="backup-codes-fresh-copy"
            >
              {copied ? "Skopírované" : "Skopírovať"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={download}
              data-testid="backup-codes-fresh-download"
            >
              Stiahnuť ako .txt
            </Button>
          </div>
        </div>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            disabled={busy}
            data-testid="backup-codes-regenerate-button"
          >
            {t("btn_regenerate")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent data-testid="backup-codes-regenerate-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("btn_regenerate")}</AlertDialogTitle>
            <AlertDialogDescription>{t("regenerate_confirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="backup-codes-regenerate-cancel">
              {t("regenerate_cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={onRegenerate} data-testid="backup-codes-regenerate-confirm">
              {t("regenerate_yes")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
