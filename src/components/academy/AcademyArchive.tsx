import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";

import { difficultyLabel } from "@/lib/academy/difficulty";
import { filterAcademy, type AcademyLaneFilter } from "@/lib/academy/filter";
import type { AcademyListItem } from "@/lib/academy/queries";
import { cn } from "@/lib/utils";

// E55.3 — shared archive layout for /academy/category/$slug and
// /academy/author/$slug: a heading + a grid of entry cards.
// E65 — when any entry carries a difficulty (the safe-AI section's audience
// lanes), an "audience" toggle narrows the grid; lane-less entries stay
// visible in every lane.

export interface AcademyArchiveProps {
  heading: string;
  description?: string | null;
  items: AcademyListItem[];
  isLoading: boolean;
}

const LANE_TABS: { value: AcademyLaneFilter; label: string }[] = [
  { value: "all", label: "Všetko" },
  { value: "beginner", label: "Pre každého" },
  { value: "advanced", label: "Pre odborníkov" },
];

export function AcademyArchive({ heading, description, items, isLoading }: AcademyArchiveProps) {
  const [lane, setLane] = useState<AcademyLaneFilter>("all");
  const hasLanes = items.some((item) => item.difficulty !== null);
  const visible = useMemo(
    () => (hasLanes ? filterAcademy(items, { type: "all", query: "", lane }) : items),
    [items, hasLanes, lane],
  );

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

      {hasLanes ? (
        <div
          role="tablist"
          aria-label="Pre koho"
          className="mt-6 inline-flex gap-1 rounded-xl bg-card/40 p-1"
        >
          {LANE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={lane === tab.value}
              data-testid={`academy-archive-lane-${tab.value}`}
              onClick={() => setLane(tab.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                lane === tab.value ? "bg-card text-foreground" : "text-muted-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <p className="mt-10 text-muted-foreground">Načítavam…</p>
      ) : visible.length === 0 ? (
        <p className="mt-10 text-muted-foreground" data-testid="academy-archive-empty">
          Zatiaľ tu nič nie je.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {visible.map((item) => {
            const label = difficultyLabel(item.content_type, item.difficulty);
            return (
              <li key={item.id}>
                <Link
                  to="/academy/$slug"
                  params={{ slug: item.slug }}
                  data-testid="academy-archive-card"
                  data-difficulty={item.difficulty ?? undefined}
                  className="flex h-full flex-col rounded-2xl border border-border/60 bg-card/40 p-5 transition-colors hover:bg-card"
                >
                  {label ? (
                    <span
                      data-testid="academy-archive-card-lane"
                      className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {label}
                    </span>
                  ) : null}
                  <span className="font-semibold text-foreground">{item.title}</span>
                  <span className="mt-1 text-sm text-muted-foreground">{item.excerpt}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
