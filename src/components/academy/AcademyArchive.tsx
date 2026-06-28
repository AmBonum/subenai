import { Link } from "@tanstack/react-router";

import type { AcademyListItem } from "@/lib/academy/queries";

// E55.3 — shared archive layout for /academy/category/$slug and
// /academy/author/$slug: a heading + a grid of entry cards.

export interface AcademyArchiveProps {
  heading: string;
  description?: string | null;
  items: AcademyListItem[];
  isLoading: boolean;
}

export function AcademyArchive({ heading, description, items, isLoading }: AcademyArchiveProps) {
  return (
    <div
      data-testid="academy-archive-root"
      className="mx-auto max-w-5xl px-4 py-12 sm:px-6 md:py-16"
    >
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link to="/academy" className="hover:text-foreground">
          Akadémia
        </Link>
      </nav>
      <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        {heading}
      </h1>
      {description ? <p className="mt-2 text-lg text-muted-foreground">{description}</p> : null}

      {isLoading ? (
        <p className="mt-10 text-muted-foreground">Načítavam…</p>
      ) : items.length === 0 ? (
        <p className="mt-10 text-muted-foreground" data-testid="academy-archive-empty">
          Zatiaľ tu nič nie je.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                to="/academy/$slug"
                params={{ slug: item.slug }}
                data-testid="academy-archive-card"
                className="flex h-full flex-col rounded-2xl border border-border/60 bg-card/40 p-5 transition-colors hover:bg-card"
              >
                <span className="font-semibold text-foreground">{item.title}</span>
                <span className="mt-1 text-sm text-muted-foreground">{item.excerpt}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
