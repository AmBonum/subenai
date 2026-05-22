import { useState } from "react";
import { Loader2 } from "lucide-react";

import { useAttachmentSignedUrl } from "@/lib/admin/use-attachment-signed-url";

interface AttachmentPdfPreviewProps {
  attachmentId: string;
  filename: string;
}

export function AttachmentPdfPreview({ attachmentId, filename }: AttachmentPdfPreviewProps) {
  const q = useAttachmentSignedUrl(attachmentId, { enabled: true, inline: true });
  const [loadFailed, setLoadFailed] = useState(false);

  if (q.isLoading) {
    return (
      <div
        data-testid={`admin-ticket-attachment-pdf-loading-${attachmentId}`}
        className="flex h-[600px] w-full items-center justify-center rounded-md border border-border bg-muted/40"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">Načítavam prílohu…</span>
      </div>
    );
  }

  if (q.isError || !q.data) {
    return (
      <div
        data-testid={`admin-ticket-attachment-pdf-error-${attachmentId}`}
        className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
      >
        <p>Súbor sa nepodarilo načítať. Stiahnite si ho manuálne.</p>
        <button
          type="button"
          onClick={() => {
            setLoadFailed(false);
            q.refetch();
          }}
          className="mt-2 text-xs font-semibold underline"
          data-testid={`admin-ticket-attachment-pdf-retry-${attachmentId}`}
        >
          Skúsiť znova
        </button>
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div
        data-testid={`admin-ticket-attachment-pdf-unsupported-${attachmentId}`}
        className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground"
      >
        Náhľad nie je dostupný pre tento typ súboru.
      </div>
    );
  }

  return (
    <iframe
      // PDF.js (the renderer Chromium ships) needs `allow-scripts` inside
      // the sandbox to draw the document. We keep the rest of the sandbox
      // tight: no top-navigation, no forms, no pointer-lock. The signed
      // URL itself is short-lived (12-15 min) and scoped to the file.
      src={q.data.signed_url}
      title={`Príloha PDF: ${filename}`}
      width="100%"
      height={600}
      loading="lazy"
      sandbox="allow-same-origin allow-scripts allow-popups"
      onError={() => setLoadFailed(true)}
      className="w-full rounded-md border border-border bg-card"
      data-testid={`admin-ticket-attachment-pdf-${attachmentId}`}
    />
  );
}
