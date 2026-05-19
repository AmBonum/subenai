import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

const CALLOUT_KEYWORDS: Record<string, { tone: CalloutTone; label: string }> = {
  tip: { tone: "info", label: "💡 tip" },
  pozor: { tone: "warn", label: "⚠ pozor" },
  varovanie: { tone: "warn", label: "⚠ varovanie" },
  pozn: { tone: "info", label: "📌 poznámka" },
  poznámka: { tone: "info", label: "📌 poznámka" },
  poznamka: { tone: "info", label: "📌 poznámka" },
  príklad: { tone: "neutral", label: "📖 príklad" },
  priklad: { tone: "neutral", label: "📖 príklad" },
  príbeh: { tone: "neutral", label: "📖 príbeh" },
  pribeh: { tone: "neutral", label: "📖 príbeh" },
  zhrnutie: { tone: "info", label: "🧾 zhrnutie" },
  dôležité: { tone: "warn", label: "⚠ dôležité" },
  dolezite: { tone: "warn", label: "⚠ dôležité" },
  fakt: { tone: "info", label: "📊 fakt" },
  číslo: { tone: "info", label: "📊 číslo" },
  cislo: { tone: "info", label: "📊 číslo" },
};

type CalloutTone = "info" | "warn" | "neutral";

const TONE_CLASSES: Record<CalloutTone, string> = {
  info: "border-primary/30 bg-primary/5 text-foreground",
  warn: "border-warning/40 bg-warning/10 text-foreground",
  neutral: "border-border bg-card text-foreground",
};

interface CalloutMatch {
  tone: CalloutTone;
  label: string;
  rest: ReactNode;
}

// Detect "<strong>Keyword:</strong> rest of paragraph" and return a
// callout config + the remaining children. Returns null if not a
// callout.
function detectCallout(children: ReactNode): CalloutMatch | null {
  const arr = Array.isArray(children) ? children : [children];
  if (arr.length === 0) return null;
  const first = arr[0];
  if (typeof first !== "object" || first === null || !("props" in first)) return null;
  const node = first as { type?: unknown; props?: { children?: ReactNode } };
  if (node.type !== "strong") return null;
  const inner = node.props?.children;
  const text = typeof inner === "string" ? inner : Array.isArray(inner) ? inner.join("") : "";
  // Trim trailing colon — accepts "Tip", "Tip:", "Tip: "
  const normalized = text
    .replace(/[:\s]+$/u, "")
    .trim()
    .toLowerCase();
  const match = CALLOUT_KEYWORDS[normalized];
  if (!match) return null;
  // Drop leading whitespace text node + the <strong> itself; keep rest.
  const rest = arr.slice(1);
  // If the remaining starts with ": ", trim that opener.
  if (typeof rest[0] === "string") {
    rest[0] = (rest[0] as string).replace(/^[:\s]+/u, "");
  }
  return { tone: match.tone, label: match.label, rest };
}

export function BlogPostBody({ mdx }: { mdx: string }) {
  return (
    <article
      className="mx-auto mt-8 max-w-3xl text-base leading-[1.75] text-foreground/90"
      data-testid="blog-post-body"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="mt-14 scroll-mt-24 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-10 scroll-mt-24 text-xl font-semibold tracking-tight text-foreground md:text-2xl">
              {children}
            </h3>
          ),
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
          img: ({ src, alt }) => (
            <figure className="my-8">
              <img
                src={src}
                alt={alt ?? ""}
                loading="lazy"
                className="w-full rounded-xl border border-border"
              />
              {alt && (
                <figcaption className="mt-2 text-center text-sm text-muted-foreground">
                  {alt}
                </figcaption>
              )}
            </figure>
          ),
        }}
      >
        {mdx}
      </ReactMarkdown>
    </article>
  );
}
