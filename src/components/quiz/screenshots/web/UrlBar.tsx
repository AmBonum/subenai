import { tFor } from "@/i18n/quiz";

interface Props {
  url: string;
  secure?: boolean;
}

/** Chrome-style URL bar screenshot */
export function UrlBar({ url, secure = true }: Props) {
  const t = tFor("screenshots");
  return (
    <div className="mx-auto w-full max-w-xl overflow-hidden rounded-xl border border-border/60 bg-[oklch(0.95_0.005_260)] shadow-card">
      {/* tab strip */}
      <div className="flex items-end gap-1 bg-[oklch(0.85_0.01_260)] px-3 pt-2">
        <div className="flex max-w-[200px] items-center gap-2 rounded-t-lg bg-[oklch(0.95_0.005_260)] px-3 py-1.5 text-[11px] text-zinc-700">
          <span className="h-3 w-3 shrink-0 rounded-sm bg-zinc-400" />
          <span className="truncate">{t("url_tab")}</span>
          <span className="text-zinc-400">×</span>
        </div>
      </div>
      {/* address bar */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex gap-1 text-zinc-500">
          <span>←</span>
          <span>→</span>
          <span>↻</span>
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[12px] text-zinc-800 shadow-inner">
          <span className={secure ? "text-zinc-500" : "text-red-500"}>{secure ? "🔒" : "⚠"}</span>
          <span className="break-all font-mono">{url}</span>
        </div>
      </div>
    </div>
  );
}
