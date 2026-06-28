import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

import { useAcademyList, type AcademyListItem } from "@/lib/academy/queries";
import { filterAcademy, type AcademyTypeFilter } from "@/lib/academy/filter";
import { cn } from "@/lib/utils";

// E55.3 — the unified Academy hub. One index for articles + interactive
// lessons, filterable by type and a free-text query.

const TYPE_TABS: { value: AcademyTypeFilter; label: string }[] = [
  { value: "all", label: "Všetko" },
  { value: "lesson", label: "Kurzy" },
  { value: "article", label: "Články" },
];

function EntryCard({ item }: { item: AcademyListItem }) {
  const isLesson = item.content_type === "lesson";
  return (
    <li>
      <Link
        to="/academy/$slug"
        params={{ slug: item.slug }}
        data-testid="academy-index-card"
        data-content-type={item.content_type}
        className="flex h-full flex-col rounded-2xl border border-border/60 bg-card/40 p-5 transition-colors hover:bg-card"
      >
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {isLesson ? <span aria-hidden="true">{item.hero_emoji ?? "🎓"}</span> : null}
          <span>{isLesson ? "Kurz" : item.category.name}</span>
          {isLesson && item.difficulty ? <span>· {item.difficulty}</span> : null}
          {isLesson && item.estimated_minutes ? (
            <span>· {item.estimated_minutes} min</span>
          ) : !isLesson && item.reading_minutes ? (
            <span>· {item.reading_minutes} min</span>
          ) : null}
        </div>
        <span className="font-semibold text-foreground">{item.title}</span>
        <span className="mt-1 text-sm text-muted-foreground">{item.excerpt}</span>
      </Link>
    </li>
  );
}

export function AcademyIndex() {
  const { data, isLoading, isError } = useAcademyList();
  const [type, setType] = useState<AcademyTypeFilter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => filterAcademy(data ?? [], { type, query }), [data, type, query]);

  return (
    <div data-testid="academy-index-root" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 md:py-16">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Akadémia
        </h1>
        <p className="text-lg text-muted-foreground">
          Interaktívne kurzy a články o podvodoch — uč sa rozpoznať ich na reálnych príkladoch.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Typ obsahu"
          className="inline-flex gap-1 rounded-xl bg-card/40 p-1"
        >
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={type === tab.value}
              data-testid={`academy-index-tab-${tab.value}`}
              onClick={() => setType(tab.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                type === tab.value ? "bg-card text-foreground" : "text-muted-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="academy-index-search"
          placeholder="Hľadať…"
          aria-label="Hľadať v akadémii"
          className="w-full rounded-xl border border-border/60 bg-card/40 px-4 py-2 text-sm sm:w-64"
        />
      </div>

      {isLoading ? (
        <p className="mt-10 text-muted-foreground" data-testid="academy-index-loading">
          Načítavam…
        </p>
      ) : isError ? (
        <p className="mt-10 text-destructive" data-testid="academy-index-error">
          Obsah sa nepodarilo načítať.
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-10 text-muted-foreground" data-testid="academy-index-empty">
          Nič sa nenašlo.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {filtered.map((item) => (
            <EntryCard key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}
