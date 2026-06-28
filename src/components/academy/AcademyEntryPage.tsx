import { Link } from "@tanstack/react-router";

import { AcademyBody } from "@/components/academy/AcademyBody";
import type { AcademyEntryDetail } from "@/lib/academy/queries";

// E55.3 — renders one academy entry (article or interactive lesson). The body
// goes through AcademyBody so [[quiz:…]] widgets mount inline.

export interface AcademyEntryPageProps {
  entry: AcademyEntryDetail;
}

export function AcademyEntryPage({ entry }: AcademyEntryPageProps) {
  const isLesson = entry.content_type === "lesson";
  return (
    <article
      data-testid="academy-entry-root"
      data-content-type={entry.content_type}
      className="mx-auto max-w-3xl px-4 py-10 sm:px-6 md:py-14"
    >
      <nav className="mb-6 text-sm text-muted-foreground">
        <Link to="/academy" className="hover:text-foreground">
          Akadémia
        </Link>
        <span aria-hidden="true"> / </span>
        <span>{entry.category.name}</span>
      </nav>

      <header className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {isLesson ? <span aria-hidden="true">{entry.hero_emoji ?? "🎓"}</span> : null}
          <span>{isLesson ? "Kurz" : "Článok"}</span>
          {isLesson && entry.difficulty ? <span>· {entry.difficulty}</span> : null}
          {isLesson && entry.estimated_minutes ? (
            <span>· {entry.estimated_minutes} min</span>
          ) : null}
          {!isLesson && entry.reading_minutes ? <span>· {entry.reading_minutes} min</span> : null}
        </div>
        <h1
          data-testid="academy-entry-title"
          className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
        >
          {entry.title}
        </h1>
        {entry.subtitle ? <p className="text-lg text-muted-foreground">{entry.subtitle}</p> : null}
      </header>

      <div className="mt-8">
        <AcademyBody body={entry.body_mdx} />
      </div>

      {entry.sources.length > 0 ? (
        <footer className="mt-12 border-t border-border/40 pt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Zdroje
          </h2>
          <ul className="mt-3 space-y-1 text-sm">
            {entry.sources.map((s, i) => (
              <li key={i}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-foreground"
                >
                  {s.label}
                </a>
                {s.publisher ? (
                  <span className="text-muted-foreground"> — {s.publisher}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </footer>
      ) : null}
    </article>
  );
}
