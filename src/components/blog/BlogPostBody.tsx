import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { slugifyHeading } from "@/lib/blog/slugify-heading";

// Track heading id collisions across the article render so the TOC and
// the in-body H2/H3 ids stay in lock-step (same dedupe rule on both
// sides). Resets on every BlogPostBody render via useMemo-style local
// state — not module-level — to avoid leakage between articles.

// E16.4 — richer typography + auto-derived callouts.
//
// Body is plain Markdown today (with GFM); the column keeps the `mdx`
// suffix because the schema will accept real MDX (with embedded React
// components) in a later epic. Per-element styles are inlined here
// because @tailwindcss/typography is not installed — gives full control
// over rendered output without pulling another dependency.
//
// Callout heuristic: a paragraph whose first child is <strong> matching
// one of CALLOUT_KEYWORDS gets rendered as a coloured callout box.
// Keeps 80 existing MDX files untouched — they already use this pattern
// liberally ("**Tip:** ...", "**Pozor:** ...", "**Príklad:** ...").

// Maps bold-prefixed paragraph leaders ("**X:** …") to a styled
// callout. Keys are normalized to lowercase with trailing colon/space
// stripped. The list reflects the dictionary the existing 80 MDX
// articles actually use (audited via grep) — pros/cons rows, product
// reviews, scam-feature taxonomy, red flags, rules.
const CALLOUT_KEYWORDS: Record<string, { tone: CalloutTone; label: string }> = {
  // Pros / cons (12+12 occurrences across comparison articles)
  plus: { tone: "pos", label: "✓ plus" },
  mínus: { tone: "neg", label: "✗ mínus" },
  minus: { tone: "neg", label: "✗ mínus" },
  // Product review verdicts
  verdikt: { tone: "info", label: "🏁 verdikt" },
  "pre koho": { tone: "info", label: "🎯 pre koho" },
  "komu odporúčame": { tone: "info", label: "🎯 komu odporúčame" },
  "komu odporucame": { tone: "info", label: "🎯 komu odporúčame" },
  cena: { tone: "neutral", label: "💰 cena" },
  "cena (k 2026-05)": { tone: "neutral", label: "💰 cena (2026-05)" },
  // Scam-feature taxonomy
  "detekčný znak": { tone: "warn", label: "🔍 detekčný znak" },
  "detekcny znak": { tone: "warn", label: "🔍 detekčný znak" },
  "červená vlajka": { tone: "warn", label: "🚩 červená vlajka" },
  "cervena vlajka": { tone: "warn", label: "🚩 červená vlajka" },
  "červené vlajky vzoru": { tone: "warn", label: "🚩 červené vlajky" },
  // Definitions
  "čo to je": { tone: "neutral", label: "📖 čo to je" },
  "co to je": { tone: "neutral", label: "📖 čo to je" },
  "čo je": { tone: "neutral", label: "📖 čo je" },
  "co je": { tone: "neutral", label: "📖 čo je" },
  "ako vyzerá": { tone: "neutral", label: "📖 ako vyzerá" },
  "ako vyzera": { tone: "neutral", label: "📖 ako vyzerá" },
  // Phishing email/SMS anatomy
  odosielateľ: { tone: "neutral", label: "✉ odosielateľ" },
  odosielatel: { tone: "neutral", label: "✉ odosielateľ" },
  predmet: { tone: "neutral", label: "📩 predmet" },
  // Rules & summaries
  "zlaté pravidlo": { tone: "info", label: "⭐ zlaté pravidlo" },
  "zlate pravidlo": { tone: "info", label: "⭐ zlaté pravidlo" },
  zhrnutie: { tone: "info", label: "🧾 zhrnutie" },
  // Generic safety net (kept so future editors can use them too)
  tip: { tone: "info", label: "💡 tip" },
  pozor: { tone: "warn", label: "⚠ pozor" },
  varovanie: { tone: "warn", label: "⚠ varovanie" },
  poznámka: { tone: "info", label: "📌 poznámka" },
  poznamka: { tone: "info", label: "📌 poznámka" },
  príklad: { tone: "neutral", label: "📖 príklad" },
  priklad: { tone: "neutral", label: "📖 príklad" },
  príbeh: { tone: "neutral", label: "📖 príbeh" },
  pribeh: { tone: "neutral", label: "📖 príbeh" },
  dôležité: { tone: "warn", label: "⚠ dôležité" },
  dolezite: { tone: "warn", label: "⚠ dôležité" },
  fakt: { tone: "info", label: "📊 fakt" },
  číslo: { tone: "info", label: "📊 číslo" },
  cislo: { tone: "info", label: "📊 číslo" },
};

type CalloutTone = "info" | "warn" | "neutral" | "pos" | "neg";

const TONE_CLASSES: Record<CalloutTone, string> = {
  info: "border-l-primary bg-primary/5 text-foreground",
  warn: "border-l-warning bg-warning/10 text-foreground",
  neutral: "border-l-border bg-card text-foreground",
  pos: "border-l-success bg-success/10 text-foreground",
  neg: "border-l-destructive bg-destructive/10 text-foreground",
};

interface CalloutMatch {
  tone: CalloutTone;
  label: string;
  rest: ReactNode;
}

// Recursively flatten any React children into a single string. Handles
// strings, numbers, arrays, fragments and React elements (whose own
// children get walked) — gracefully returns "" for unrenderable nodes.
function reactNodeToText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(reactNodeToText).join("");
  if (typeof node === "object" && "props" in node) {
    const inner = (node as { props?: { children?: ReactNode } }).props?.children;
    return reactNodeToText(inner);
  }
  return "";
}

// Detect "<strong>Keyword:</strong> rest of paragraph" and return a
// callout config + the remaining children. The detection is tolerant
// of leading whitespace text-nodes and of children coming in as a
// single ReactElement vs. an array.
function detectCallout(children: ReactNode): CalloutMatch | null {
  const arr = Array.isArray(children) ? [...children] : [children];
  // Skip leading whitespace-only text nodes so a paragraph that starts
  // with a single space before <strong> still matches.
  while (arr.length > 0 && typeof arr[0] === "string" && (arr[0] as string).trim() === "") {
    arr.shift();
  }
  if (arr.length === 0) return null;
  const first = arr[0];
  if (typeof first !== "object" || first === null || !("props" in first)) return null;
  const node = first as { type?: unknown; props?: { children?: ReactNode } };
  // react-markdown can hand the custom `strong` override either as the
  // string tag "strong" or as the function component we registered;
  // accept both. (The function path appears when nested formatting is
  // present; the string path is the common single-line case.)
  const type = node.type;
  const isStrong =
    type === "strong" ||
    (typeof type === "function" && (type as { name?: string }).name === "strong");
  if (!isStrong) return null;
  const text = reactNodeToText(node.props?.children);
  const normalized = text
    .replace(/[:\s]+$/u, "")
    .trim()
    .toLowerCase();
  const match = CALLOUT_KEYWORDS[normalized];
  if (!match) return null;
  const rest = arr.slice(1);
  if (typeof rest[0] === "string") {
    rest[0] = (rest[0] as string).replace(/^[:\s]+/u, "");
  }
  return { tone: match.tone, label: match.label, rest };
}

const THEMED_SUFFIX = "#themed";

// Markdown image renderer. A `#themed` fragment on the src opts the image
// into a light/dark pair (E57): the author commits `<name>.png` (light) +
// `<name>-dark.png` (dark) and we render BOTH, toggling visibility with the
// class-based `dark:` variant — so a documentation screenshot always matches
// the theme the reader currently has set. Plain images render unchanged.
function MarkdownImage({ src, alt }: { src?: string; alt?: string }) {
  const caption = alt ? (
    <figcaption className="mt-2 text-center text-sm text-muted-foreground">{alt}</figcaption>
  ) : null;

  if (typeof src === "string" && src.endsWith(THEMED_SUFFIX)) {
    const light = src.slice(0, -THEMED_SUFFIX.length);
    const dark = light.replace(/\.(png|jpe?g|webp|avif)$/i, "-dark.$1");
    return (
      <figure className="my-8" data-testid="markdown-themed-image">
        <img
          src={light}
          alt={alt ?? ""}
          loading="lazy"
          data-theme="light"
          className="block w-full rounded-xl border border-border dark:hidden"
        />
        <img
          src={dark}
          alt={alt ?? ""}
          loading="lazy"
          data-theme="dark"
          className="hidden w-full rounded-xl border border-border dark:block"
        />
        {caption}
      </figure>
    );
  }

  return (
    <figure className="my-8">
      {/* `auto 16/9` reserves a 16:9 box before the image loads (kills the
          CLS of dimension-less markdown images) but switches to the intrinsic
          ratio once metadata arrives — no cropping for non-16:9 images. */}
      <img
        src={src}
        alt={alt ?? ""}
        loading="lazy"
        style={{ aspectRatio: "auto 16 / 9" }}
        className="w-full rounded-xl border border-border"
      />
      {caption}
    </figure>
  );
}

export function BlogPostBody({ mdx }: { mdx: string }) {
  // Per-render id counter so duplicate headings get -2, -3 suffixes
  // matching the TOC's dedupe (both use the same slugifier).
  const seen = new Map<string, number>();
  const assignId = (text: string): string => {
    const base = slugifyHeading(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}-${count}`;
  };
  return (
    <article
      className="mx-auto mt-8 max-w-3xl text-base leading-[1.75] text-foreground/90"
      data-testid="blog-post-body"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => {
            const id = assignId(reactNodeToText(children));
            return (
              <h2
                id={id}
                className="group mt-14 scroll-mt-24 text-2xl font-bold tracking-tight text-foreground md:text-3xl"
              >
                <a
                  href={`#${id}`}
                  className="opacity-70 transition-opacity hover:opacity-100"
                  aria-label="odkaz na túto sekciu"
                >
                  <span className="text-primary">#</span>{" "}
                </a>
                {children}
              </h2>
            );
          },
          h3: ({ children }) => {
            const id = assignId(reactNodeToText(children));
            return (
              <h3
                id={id}
                className="group mt-10 scroll-mt-24 text-xl font-semibold tracking-tight text-foreground md:text-2xl"
              >
                <a
                  href={`#${id}`}
                  className="opacity-70 transition-opacity hover:opacity-100"
                  aria-label="odkaz na túto sekciu"
                >
                  <span className="text-primary">#</span>{" "}
                </a>
                {children}
              </h3>
            );
          },
          h4: ({ children }) => (
            <h4 className="mt-8 text-lg font-semibold text-foreground md:text-xl">{children}</h4>
          ),
          p: ({ children }) => {
            const callout = detectCallout(children);
            if (callout) {
              return (
                <div
                  className={`mt-6 rounded-xl border-l-4 p-5 ${TONE_CLASSES[callout.tone]}`}
                  data-testid="blog-post-callout"
                >
                  <p className="text-xs font-bold uppercase tracking-widest opacity-80">
                    {callout.label}
                  </p>
                  <p className="mt-2 text-base leading-relaxed">{callout.rest}</p>
                </div>
              );
            }
            return <p className="mt-5">{children}</p>;
          },
          ul: ({ children }) => (
            <ul className="mt-5 space-y-2 pl-6 marker:text-primary [&_li]:list-disc">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mt-5 space-y-2 pl-6 marker:font-bold marker:text-primary [&_li]:list-decimal">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1 leading-relaxed">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="font-medium text-primary underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-8 rounded-r-xl border-l-4 border-primary bg-card/60 px-6 py-4 text-lg italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">
              {children}
            </code>
          ),
          hr: () => <hr className="my-12 border-border" />,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          table: ({ children }) => (
            <div className="mt-6 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-card">{children}</thead>,
          tbody: ({ children }) => <tbody className="divide-y divide-border">{children}</tbody>,
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-semibold text-foreground">{children}</th>
          ),
          td: ({ children }) => <td className="px-4 py-3 align-top">{children}</td>,
          img: ({ src, alt }) => <MarkdownImage src={src} alt={alt} />,
        }}
      >
        {mdx}
      </ReactMarkdown>
    </article>
  );
}
