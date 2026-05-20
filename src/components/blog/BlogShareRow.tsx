import { useEffect, useRef, useState } from "react";

import { trackBlogShareClick } from "@/lib/analytics/blog-events";
import { copyToClipboard } from "@/lib/browser/clipboard";

interface BlogShareRowProps {
  url: string;
  title: string;
  // Caller passes the post slug so the analytics event can include it
  // (the share URL alone would require re-parsing). Optional so unit
  // tests can render without the analytics dimension.
  postSlug?: string;
}

// Inline share row for blog articles. Renders Twitter/X, Facebook,
// LinkedIn and a "copy link" button. Uses share-intent URLs so no
// JS SDK is loaded (faster Web Vitals; respects user privacy — no
// FB/Twitter pixel fires until the user clicks). Copy delegates to
// the canonical clipboard helper (Clipboard API → execCommand
// fallback). When BOTH paths fail (cross-origin iframe, locked-down
// webview), an inline readonly input replaces the native
// window.prompt — the URL is pre-selected so the user can ⌘C
// manually without OS-styled prompts breaking the design.
export function BlogShareRow({ url, title, postSlug }: BlogShareRowProps) {
  const [copied, setCopied] = useState(false);
  const [manualFallback, setManualFallback] = useState(false);
  const fallbackInputRef = useRef<HTMLInputElement | null>(null);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  type SharePlatform = "twitter" | "facebook" | "linkedin";
  const links: ReadonlyArray<{
    name: string;
    href: string;
    glyph: string;
    testid: string;
    platform: SharePlatform;
  }> = [
    {
      name: "Twitter / X",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      glyph: "𝕏",
      testid: "blog-share-twitter",
      platform: "twitter",
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      glyph: "f",
      testid: "blog-share-facebook",
      platform: "facebook",
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      glyph: "in",
      testid: "blog-share-linkedin",
      platform: "linkedin",
    },
  ];
  const handleCopy = async () => {
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setManualFallback(false);
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      // Clipboard API + execCommand both refused (cross-origin iframe,
      // locked-down webview). Surface an inline readonly input that
      // pre-selects the URL — user does ⌘C / Ctrl+C manually.
      setManualFallback(true);
    }
    if (postSlug) {
      trackBlogShareClick({ post_slug: postSlug, platform: "copy_link" });
    }
  };

  // When the manual-fallback input mounts, select all its text so the
  // user only needs to ⌘C. Focus is set so the visible selection
  // highlight renders immediately.
  useEffect(() => {
    if (manualFallback && fallbackInputRef.current) {
      fallbackInputRef.current.focus();
      fallbackInputRef.current.select();
    }
  }, [manualFallback]);
  return (
    <div
      className="mt-12 flex flex-wrap items-center gap-3 border-t border-border pt-6"
      data-testid="blog-share-row"
    >
      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        zdieľaj:
      </span>
      <div className="flex gap-2">
        {links.map((l) => (
          <a
            key={l.name}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`zdieľať na ${l.name}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
            data-testid={l.testid}
            onClick={
              postSlug
                ? () => trackBlogShareClick({ post_slug: postSlug, platform: l.platform })
                : undefined
            }
          >
            <span aria-hidden="true">{l.glyph}</span>
          </a>
        ))}
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
          data-testid="blog-share-copy"
        >
          <span aria-hidden="true">🔗</span>
          <span>{copied ? "skopírované ✓" : "kopírovať odkaz"}</span>
        </button>
      </div>
      {manualFallback && (
        <div
          className="mt-3 flex w-full flex-wrap items-center gap-2 rounded-lg border border-border bg-card/60 p-3 text-xs sm:flex-nowrap"
          role="status"
          aria-live="polite"
          data-testid="blog-share-copy-fallback"
        >
          <label htmlFor="blog-share-copy-fallback-input" className="text-muted-foreground">
            skopíruj odkaz manuálne:
          </label>
          <input
            id="blog-share-copy-fallback-input"
            ref={fallbackInputRef}
            type="text"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            data-testid="blog-share-copy-fallback-input"
          />
          <button
            type="button"
            onClick={() => setManualFallback(false)}
            aria-label="zatvoriť"
            className="rounded-full px-2 py-1 text-muted-foreground hover:text-foreground"
            data-testid="blog-share-copy-fallback-dismiss"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
