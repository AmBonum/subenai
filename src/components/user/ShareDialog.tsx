import { useState } from "react";
import { Copy, Check } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tFor } from "@/i18n/tests";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shareId: string;
}

export function ShareDialog({ open, onOpenChange, shareId }: ShareDialogProps) {
  const t = tFor("share_dialog");
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined" ? `${window.location.origin}/t/${shareId}` : `/t/${shareId}`;

  const onCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="share-dialog-root">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="share-dialog-url">{t("url_label")}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="share-dialog-url"
              readOnly
              value={url}
              data-testid="share-dialog-url-input"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={onCopy}
              data-testid="share-dialog-copy-link-button"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-3 w-3" />
                  {t("copied")}
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-3 w-3" />
                  {t("copy_button")}
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            data-testid="share-dialog-close-button"
          >
            {t("close_button")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
