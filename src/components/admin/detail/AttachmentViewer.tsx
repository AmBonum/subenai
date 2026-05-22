import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { AttachmentItem, type AttachmentItemAttachment } from "./AttachmentItem";
import type { LightboxAttachment } from "./AttachmentLightbox";

interface AttachmentViewerProps {
  attachments: AttachmentItemAttachment[];
}

function formatTotal(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentViewer({ attachments }: AttachmentViewerProps) {
  // Hide the whole section when empty — per spec.
  // Hook order is preserved: useState / useMemo run unconditionally
  // before the early return.
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (attachments.length > 0) initial.add(attachments[0].id);
    return initial;
  });

  const imageSiblings = useMemo<LightboxAttachment[]>(
    () =>
      attachments
        .filter((a) => a.mime_type.startsWith("image/") && a.scan_status !== "infected")
        .map((a) => ({ id: a.id, filename: a.filename, mime_type: a.mime_type })),
    [attachments],
  );

  if (attachments.length === 0) return null;

  const total = attachments.reduce((acc, a) => acc + a.size_bytes, 0);
  const allExpanded = expanded.size === attachments.length;

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allExpanded) {
      setExpanded(new Set());
    } else {
      setExpanded(new Set(attachments.map((a) => a.id)));
    }
  }

  return (
    <section
      className="rounded-md border border-border bg-card p-4"
      data-testid="admin-ticket-attachment-viewer"
      aria-labelledby="admin-ticket-attachment-viewer-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id="admin-ticket-attachment-viewer-heading"
          className="text-sm font-semibold text-foreground"
          data-testid="admin-ticket-attachment-viewer-heading"
        >
          Prílohy ({attachments.length})
        </h3>
        <div className="flex items-center gap-3">
          <span
            className="text-xs text-muted-foreground"
            data-testid="admin-ticket-attachment-viewer-total"
          >
            Spolu: {formatTotal(total)}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleAll}
            data-testid="admin-ticket-attachment-viewer-toggle-all"
          >
            {allExpanded ? "Zbaliť všetky" : "Rozbaliť všetky"}
          </Button>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {attachments.map((a) => (
          <AttachmentItem
            key={a.id}
            attachment={a}
            expanded={expanded.has(a.id)}
            onToggle={() => toggle(a.id)}
            imageSiblings={imageSiblings}
          />
        ))}
      </div>
    </section>
  );
}
