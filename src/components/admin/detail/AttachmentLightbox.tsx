import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { useAttachmentSignedUrl } from "@/lib/admin/use-attachment-signed-url";

export interface LightboxAttachment {
  id: string;
  filename: string;
  mime_type: string;
}

interface AttachmentLightboxProps {
  attachments: LightboxAttachment[];
  currentIndex: number;
  onClose: () => void;
}

export function AttachmentLightbox({
  attachments,
  currentIndex,
  onClose,
}: AttachmentLightboxProps) {
  // Navigation state lives in the modal so stepping prev/next doesn't
  // force the parent ticket detail to re-render the whole attachment
  // list on every key press.
  const safeInitial = Math.max(0, Math.min(currentIndex, attachments.length - 1));
  const [index, setIndex] = useState<number>(safeInitial);
  const current = attachments[index];
  const hasPrev = index > 0;
  const hasNext = index < attachments.length - 1;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && hasPrev) {
        e.preventDefault();
        setIndex((i) => i - 1);
      } else if (e.key === "ArrowRight" && hasNext) {
        e.preventDefault();
        setIndex((i) => i + 1);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [hasPrev, hasNext]);

  if (!current) return null;

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-in data-[state=open]:fade-in-0"
          data-testid="admin-ticket-attachment-lightbox-overlay"
        />
        <DialogPrimitive.Content
          className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 outline-none"
          data-testid="admin-ticket-attachment-lightbox"
          aria-label={`Náhľad prílohy: ${current.filename}`}
        >
          <DialogPrimitive.Title className="sr-only">
            Náhľad prílohy: {current.filename}
          </DialogPrimitive.Title>

          <LightboxImage attachment={current} />

          <DialogPrimitive.Close
            className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Zavrieť náhľad prílohy"
            data-testid="admin-ticket-attachment-lightbox-close"
          >
            <X className="size-5" aria-hidden="true" />
          </DialogPrimitive.Close>

          {attachments.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => hasPrev && setIndex((i) => i - 1)}
                disabled={!hasPrev}
                className="absolute left-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Predchádzajúca príloha"
                data-testid="admin-ticket-attachment-lightbox-prev"
              >
                <ChevronLeft className="size-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => hasNext && setIndex((i) => i + 1)}
                disabled={!hasNext}
                className="absolute right-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Ďalšia príloha"
                data-testid="admin-ticket-attachment-lightbox-next"
              >
                <ChevronRight className="size-6" aria-hidden="true" />
              </button>
              <div
                className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white"
                data-testid="admin-ticket-attachment-lightbox-counter"
              >
                {index + 1} / {attachments.length}
              </div>
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function LightboxImage({ attachment }: { attachment: LightboxAttachment }) {
  const q = useAttachmentSignedUrl(attachment.id, { enabled: true, inline: true });
  if (q.isLoading || !q.data) {
    return (
      <div
        className="text-sm text-white/80"
        role="status"
        aria-live="polite"
        data-testid="admin-ticket-attachment-lightbox-loading"
      >
        Načítavam prílohu…
      </div>
    );
  }
  return (
    <img
      src={q.data.signed_url}
      alt={`Príloha: ${attachment.filename}`}
      className="max-h-[90vh] max-w-[90vw] object-contain"
      data-testid="admin-ticket-attachment-lightbox-image"
    />
  );
}
