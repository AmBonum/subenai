import { useState } from "react";
import { Loader2 } from "lucide-react";

import { useAttachmentSignedUrl } from "@/lib/admin/use-attachment-signed-url";

import { AttachmentLightbox, type LightboxAttachment } from "./AttachmentLightbox";

interface AttachmentImagePreviewProps {
  attachmentId: string;
  filename: string;
  // Sibling attachments are passed so the lightbox can navigate to the
  // next/previous image without re-walking the DOM. Only images are
  // included — PDFs do not participate in lightbox navigation.
  siblings: LightboxAttachment[];
}

export function AttachmentImagePreview({
  attachmentId,
  filename,
  siblings,
}: AttachmentImagePreviewProps) {
  const q = useAttachmentSignedUrl(attachmentId, { enabled: true, inline: true });
  const [open, setOpen] = useState(false);
  const initialIndex = Math.max(
    0,
    siblings.findIndex((s) => s.id === attachmentId),
  );

  if (q.isLoading) {
    return (
      <div
        data-testid={`admin-ticket-attachment-image-loading-${attachmentId}`}
        className="flex h-[300px] w-full max-w-[800px] items-center justify-center rounded-md border border-border bg-muted/40"
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
        data-testid={`admin-ticket-attachment-image-error-${attachmentId}`}
        className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
      >
        <p>Súbor sa nepodarilo načítať. Stiahnite si ho manuálne.</p>
        <button
          type="button"
          onClick={() => q.refetch()}
          className="mt-2 text-xs font-semibold underline"
          data-testid={`admin-ticket-attachment-image-retry-${attachmentId}`}
        >
          Skúsiť znova
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block max-w-[800px] cursor-zoom-in overflow-hidden rounded-md border border-border bg-muted/20 transition hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        data-testid={`admin-ticket-attachment-image-${attachmentId}`}
        aria-label={`Zobraziť prílohu na celej obrazovke: ${filename}`}
      >
        <img
          src={q.data.signed_url}
          alt={`Príloha: ${filename}`}
          loading="lazy"
          decoding="async"
          className="block max-h-[600px] w-full max-w-[800px] object-contain"
        />
      </button>
      {open && (
        <AttachmentLightbox
          attachments={siblings}
          currentIndex={initialIndex}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
