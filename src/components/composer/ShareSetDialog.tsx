import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { copyToClipboard } from "@/lib/browser/clipboard";
import { tFor } from "@/i18n/quiz";

// E58 — after "Zdieľať s tímom" saves a (non-edu) team set, show the
// shareable link with a copy button instead of silently navigating to the
// set's test page (which left the author with no way to get the link).

interface Props {
  publicUrl: string;
  onClose: () => void;
}

export function ShareSetDialog({ publicUrl, onClose }: Props) {
  const t = tFor("composer");
  const tCommon = tFor("common");
  const [copied, setCopied] = useState(false);

  async function copy() {
    const ok = await copyToClipboard(publicUrl);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent data-testid="composer-share-success-dialog" className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("share_dialog.title")}</DialogTitle>
          <DialogDescription>{t("share_dialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border/60 bg-card/40 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("share_dialog.link_label")}
            </p>
            <button
              type="button"
              data-testid="composer-share-copy-button"
              onClick={copy}
              aria-label={t("share_dialog.copy_aria")}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground hover:border-primary"
            >
              {copied ? (
                <>
                  <Check className="size-3" aria-hidden="true" /> {tCommon("copied")}
                </>
              ) : (
                <>
                  <Copy className="size-3" aria-hidden="true" /> {tCommon("copy")}
                </>
              )}
            </button>
          </div>
          <p data-testid="composer-share-link" className="mt-2 break-all text-sm text-foreground">
            {publicUrl}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button asChild variant="outline">
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="composer-share-open-link"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              {t("share_dialog.open")}
            </a>
          </Button>
          <Button data-testid="composer-share-close-button" onClick={onClose}>
            {t("share_dialog.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
