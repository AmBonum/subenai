import { useState } from "react";

interface BlogShareRowProps {
  url: string;
  title: string;
}

// Inline share row for blog articles. Renders Twitter/X, Facebook,
// LinkedIn and a "copy link" button. Uses share-intent URLs so no
// JS SDK is loaded (faster Web Vitals; respects user privacy — no
// FB/Twitter pixel fires until the user clicks). Copy uses the
// navigator.clipboard API with a "skopírované" inline confirmation.
export function BlogShareRow({ url, title }: BlogShareRowProps) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const links = [
    {
      name: "Twitter / X",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      glyph: "𝕏",
      testid: "blog-share-twitter",
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      glyph: "f",
      testid: "blog-share-facebook",
    },
    {
      name: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      glyph: "in",
      testid: "blog-share-linkedin",
    },
  ];
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Some browsers (older Safari, embedded webviews) block this —
      // fall back to a synthetic prompt so users can at least see it.
      window.prompt("skopíruj si odkaz:", url);
    }
  };
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
            aria-label={`Zdieľať na ${l.name}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card font-bold text-foreground transition-colors hover:border-primary hover:text-primary"
            data-testid={l.testid}
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
    </div>
  );
}
