import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import { listPublicDocs } from "@/content/docs";
import { cn } from "@/lib/utils";

// E54.2 — shared chrome for every public docs page: a category-grouped
// sidebar of public sections + the article slot. One responsibility: the
// navigation frame around any doc body.

export interface DocsLayoutProps {
  /** Slug of the doc currently shown (highlights the sidebar entry). */
  activeSlug?: string;
  children: ReactNode;
}

function groupByCategory(docs: ReturnType<typeof listPublicDocs>) {
  const groups = new Map<string, { slug: string; title: string }[]>();
  for (const d of docs) {
    const list = groups.get(d.category) ?? [];
    list.push({ slug: d.slug, title: d.title });
    groups.set(d.category, list);
  }
  return [...groups.entries()];
}

export function DocsLayout({ activeSlug, children }: DocsLayoutProps) {
  const groups = groupByCategory(listPublicDocs());

  return (
    <div
      data-testid="docs-layout-root"
      className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[16rem_1fr] md:py-14"
    >
      <nav
        data-testid="docs-sidebar"
        aria-label="Dokumentácia"
        className="md:sticky md:top-24 md:self-start"
      >
        <ul className="space-y-6">
          {groups.map(([category, items]) => (
            <li key={category}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {category}
              </p>
              <ul className="space-y-1">
                {items.map((item) => (
                  <li key={item.slug}>
                    <Link
                      to="/docs/$slug"
                      params={{ slug: item.slug }}
                      data-testid="docs-sidebar-link"
                      aria-current={item.slug === activeSlug ? "page" : undefined}
                      className={cn(
                        "block rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-card",
                        item.slug === activeSlug
                          ? "bg-card font-semibold text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </nav>

      <div data-testid="docs-content" className="min-w-0">
        {children}
      </div>
    </div>
  );
}
