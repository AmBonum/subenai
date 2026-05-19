import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AdminBlogPostDetail } from "@/lib/blog/admin-queries";
import {
  exportBlogPostAsCsv,
  exportBlogPostAsJson,
  exportBlogPostAsXml,
  exportFilename,
} from "@/lib/blog/export";

interface BlogExportMenuProps {
  post: AdminBlogPostDetail;
}

// Three download buttons (JSON / CSV / XML) for the currently-edited
// article. Generates the export string in-memory, wraps it in a Blob,
// and triggers a download via an anchor click — no server round-trip,
// no temporary URLs persisted.
//
// Lives in admin-only territory (rendered by /admin/blog/$id) so RLS
// gating happens at the page level, not here.
export function BlogExportMenu({ post }: BlogExportMenuProps) {
  const triggerDownload = (content: string, mime: string, ext: "json" | "csv" | "xml"): void => {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = exportFilename(post, ext);
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    // Browsers (Safari) sometimes need a tick before revoking — the
    // 0-delay timer is the conventional pattern that buys the browser
    // time to start the download before we tear the URL down.
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label="Exportovať článok"
      data-testid="blog-export-menu"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => triggerDownload(exportBlogPostAsJson(post), "application/json", "json")}
        data-testid="blog-export-json"
      >
        <Download className="mr-2 size-4" />
        JSON
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => triggerDownload(exportBlogPostAsCsv(post), "text/csv", "csv")}
        data-testid="blog-export-csv"
      >
        <Download className="mr-2 size-4" />
        CSV
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => triggerDownload(exportBlogPostAsXml(post), "application/xml", "xml")}
        data-testid="blog-export-xml"
      >
        <Download className="mr-2 size-4" />
        XML
      </Button>
    </div>
  );
}
