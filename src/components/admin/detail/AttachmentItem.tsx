import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Download } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useAttachmentSignedUrl } from "@/lib/admin/use-attachment-signed-url";

import { AttachmentImagePreview } from "./AttachmentImagePreview";
import { AttachmentPdfPreview } from "./AttachmentPdfPreview";
import type { LightboxAttachment } from "./AttachmentLightbox";

type ScanStatus = "pending" | "clean" | "infected" | "error";

export interface AttachmentItemAttachment {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  scan_status: ScanStatus;
}

interface AttachmentItemProps {
  attachment: AttachmentItemAttachment;
  expanded: boolean;
  onToggle: () => void;
  imageSiblings: LightboxAttachment[];
}

const SCAN_LABEL: Record<ScanStatus, string> = {
  pending: "Sken prebieha",
  clean: "Bezpečné",
  infected: "Škodlivé",
  error: "Sken zlyhal",
};

const SCAN_VARIANT: Record<ScanStatus, "outline" | "secondary" | "destructive" | "default"> = {
  pending: "outline",
  clean: "secondary",
  infected: "destructive",
  error: "destructive",
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mime: string): boolean {
  return mime.startsWith("image/");
}

function isPdf(mime: string): boolean {
  return mime === "application/pdf";
}

export function AttachmentItem({
  attachment,
  expanded,
  onToggle,
  imageSiblings,
}: AttachmentItemProps) {
  const { id, filename, mime_type, size_bytes, scan_status } = attachment;
  const renderable = isImage(mime_type) || isPdf(mime_type);
  const blocked = scan_status === "infected";

  return (
    <div
      className="overflow-hidden rounded-md border border-border bg-card"
      data-testid={`admin-ticket-attachment-card-${id}`}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-1 items-center gap-2 text-left focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm"
          aria-expanded={expanded}
          aria-label={expanded ? `Zbaliť prílohu: ${filename}` : `Rozbaliť prílohu: ${filename}`}
          data-testid={`admin-ticket-attachment-toggle-${id}`}
        >
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          )}
          <span
            className="truncate text-sm font-medium text-foreground"
            data-testid={`admin-ticket-attachment-filename-${id}`}
          >
            {filename}
          </span>
          <span className="text-xs text-muted-foreground">{formatSize(size_bytes)}</span>
          <Badge
            variant={SCAN_VARIANT[scan_status]}
            className="text-[10px]"
            data-testid={`admin-ticket-attachment-scan-${id}`}
          >
            {SCAN_LABEL[scan_status]}
          </Badge>
        </button>
        <DownloadButton attachmentId={id} filename={filename} disabled={blocked} />
      </div>

      {expanded && (
        <div
          className="border-t border-border p-3"
          data-testid={`admin-ticket-attachment-body-${id}`}
        >
          {blocked ? (
            <p
              className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              data-testid={`admin-ticket-attachment-infected-${id}`}
            >
              Súbor bol označený ako škodlivý a nie je možné ho zobraziť.
            </p>
          ) : !renderable ? (
            <p
              className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground"
              data-testid={`admin-ticket-attachment-unsupported-${id}`}
            >
              Náhľad nie je dostupný pre tento typ súboru.
            </p>
          ) : isImage(mime_type) ? (
            <AttachmentImagePreview
              attachmentId={id}
              filename={filename}
              siblings={imageSiblings}
            />
          ) : (
            <AttachmentPdfPreview attachmentId={id} filename={filename} />
          )}
        </div>
      )}
    </div>
  );
}

function DownloadButton({
  attachmentId,
  filename,
  disabled,
}: {
  attachmentId: string;
  filename: string;
  disabled: boolean;
}) {
  const [requested, setRequested] = useState(false);
  // Separate query (inline: false) so the download URL has Content-
  // Disposition: attachment; filename="…". Cache splits by `inline`
  // flag inside the hook's queryKey.
  const q = useAttachmentSignedUrl(attachmentId, {
    enabled: requested && !disabled,
    inline: false,
  });

  function handleClick() {
    if (disabled) return;
    setRequested(true);
  }

  // Once the URL resolves after a click, open it in a new tab. Browser
  // honours Content-Disposition: attachment and triggers a download.
  // Effect (not render-time call) so React stays pure.
  useEffect(() => {
    if (requested && q.data && typeof window !== "undefined") {
      window.open(q.data.signed_url, "_blank", "noopener,noreferrer");
      setRequested(false);
    }
  }, [requested, q.data]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || q.isLoading}
      className="flex size-9 items-center justify-center rounded-sm text-muted-foreground transition hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
      aria-label={`Stiahnuť prílohu: ${filename}`}
      data-testid={`admin-ticket-attachment-download-${attachmentId}`}
    >
      <Download className="size-4" aria-hidden="true" />
    </button>
  );
}
