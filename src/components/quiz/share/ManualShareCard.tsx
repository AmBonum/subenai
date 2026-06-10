import { useState } from "react";
import { copyToClipboard } from "@/lib/browser/clipboard";
import { tFor } from "@/i18n/quiz";

interface Props {
  /** Bare share URL without UTM — IG/TikTok captions aren't clickable, so
   * UTM tags would be dead ballast and only make the line longer. */
  url: string;
  /** Canonical share caption (same as Web Share API / share grid). */
  text: string;
  onDownloadStory: () => Promise<void>;
  downloading: boolean;
}

/**
 * Instagram and TikTok have no public web share intent — they're closed
 * ecosystems. Users must save an image and paste a caption into the app
 * manually. This card pairs the existing IG Story PNG download with a
 * one-click caption-to-clipboard action and 4-step instructions.
 *
 * Deliberately does NOT attempt deep-links (e.g. `instagram://`): they fail
 * silently when the app isn't installed, which is worse UX than the
 * explicit two-step flow.
 */
export function ManualShareCard({ url, text, onDownloadStory, downloading }: Props) {
  const t = tFor("manual_share");
  const tCommon = tFor("common");
  const [copied, setCopied] = useState(false);
  const caption = `${text} ${url}`;

  async function handleCopyCaption() {
    const ok = await copyToClipboard(caption);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mt-6 animate-fade-in-up rounded-2xl border border-border bg-card p-6 shadow-card">
      <h3 className="text-base font-bold">{t("title")}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t("body")}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onDownloadStory}
          disabled={downloading}
          aria-label={t("download_aria")}
          className="rounded-xl bg-accent-gradient px-5 py-3 text-base font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-60"
        >
          {downloading ? t("generating") : t("download_button")}
        </button>
        <button
          type="button"
          onClick={handleCopyCaption}
          aria-label={t("copy_caption_aria")}
          className="rounded-xl border-2 border-border bg-card px-5 py-3 text-base font-semibold transition-colors hover:border-primary/60"
        >
          {copied ? `✅ ${tCommon("copied")}` : t("copy_caption")}
        </button>
      </div>

      <ol className="mt-5 list-decimal space-y-1.5 pl-5 text-sm text-foreground/80">
        <li>{t("step_1")}</li>
        <li>{t("step_2")}</li>
        <li>{t("step_3")}</li>
        <li>{t("step_4")}</li>
      </ol>
    </div>
  );
}
