import { useEffect, useMemo, useState } from "react";

import { slugifyHeading } from "@/lib/blog/slugify-heading";

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

// Auto-generate a table of contents from the article's H2/H3 headings.
// Lives client-side because the headings are produced by react-markdown
// — SSR would require parsing the markdown twice. The TOC sits in a
// sidebar (desktop) with sticky positioning + active-section
// highlighting driven by IntersectionObserver.
//
// SEO benefit: in addition to the visible TOC, BlogPostBody assigns
// stable id attributes to H2/H3 elements; that produces fragment
// anchors Google can index as "jump to section" snippets in SERP.

interface BlogTableOfContentsProps {
  // The article body markdown; the component parses it for headings.
  mdx: string;
  // Label rendered above the list ("obsah", "v tomto článku", etc).
  label: string;
}

export function BlogTableOfContents({ mdx, label }: BlogTableOfContentsProps) {
  // Parse headings out of the raw markdown — cheaper and more reliable
  // than reading them from the DOM (no scroll-position dependency).
  const items = useMemo<TocItem[]>(() => {
    const lines = mdx.split("\n");
    const out: TocItem[] = [];
    let inFence = false;
    for (const line of lines) {
      // Skip headings inside fenced code blocks.
      if (/^```/.test(line)) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
      const m = /^(##|###)\s+(.+?)\s*$/.exec(line);
      if (!m) continue;
      const level = m[1].length === 2 ? 2 : 3;
      const text = m[2].replace(/\*\*/g, "").replace(/`/g, "");
      out.push({ id: slugifyHeading(text), text, level });
    }
    // De-duplicate ids — append numeric suffix on collision.
    const seen = new Map<string, number>();
    return out.map((item) => {
      const count = seen.get(item.id) ?? 0;
      seen.set(item.id, count + 1);
      return count === 0 ? item : { ...item, id: `${item.id}-${count}` };
    });
  }, [mdx]);

  const [activeId, setActiveId] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (items.length === 0) return undefined;
    // jsdom (vitest) + older Safari don't expose IntersectionObserver;
    // gracefully skip the active-section highlighting in that case.
    if (typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );
    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  if (items.length < 3) return null;

  return (
    <nav
      aria-label="obsah článku"
      className="hidden xl:block xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto"
      data-testid="blog-toc"
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
        data-testid="blog-toc-label"
      >
        {label}
      </p>
      <ol className="mt-3 space-y-2 text-sm" data-testid="blog-toc-list">
        {items.map((item) => (
          <li
            key={item.id}
            className={item.level === 3 ? "pl-4" : ""}
            data-testid={`blog-toc-item-${item.id}`}
          >
            <a
              href={`#${item.id}`}
              className={`block border-l-2 py-1 pl-3 transition-colors ${
                activeId === item.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`blog-toc-link-${item.id}`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
