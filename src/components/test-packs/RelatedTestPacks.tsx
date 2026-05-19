import { listPublishedPacks, type TestPack } from "@/content/test-packs";
import { TestPackCard } from "./TestPackCard";
import { tFor } from "@/i18n/quiz";

// E29 — mirror of src/components/courses/RelatedCourses.
//
// Renders on /tests/$slug under the existing
// RelatedTestPackArticleCard (which is a single blog cross-link).
// Closes the symmetry gap with /courses/$slug, which has had a
// "Pokračuj ďalším kurzom" recommendation strip since E5.
//
// Selection algorithm — same heuristic as RelatedCourses:
//   1. Filter all published packs, exclude the current one.
//   2. Prefer same-industry siblings (most relevant cross-sell).
//   3. Fill with other industries if same-industry has < 3 picks.
//   4. Cap at 3.
//   5. Return null when no other packs exist (graceful degradation).
//
// Reuses TestPackCard — same visual treatment as the catalog grid,
// so a reader sees the same hero zone + chip language they already
// recognize. No new card variant needed.
export function RelatedTestPacks({ current }: { current: TestPack }) {
  const t = tFor("testy");
  const others = listPublishedPacks().filter((p) => p.slug !== current.slug);
  const sameIndustry = others.filter((p) => p.industry === current.industry);
  const fillers = others.filter((p) => p.industry !== current.industry);
  const picks = [...sameIndustry, ...fillers].slice(0, 3);

  if (picks.length === 0) return null;

  return (
    <section
      aria-labelledby="test-pack-related-h"
      data-testid="test-pack-related"
      className="mt-12 border-t border-border/60 pt-8 print:hidden"
    >
      <h2
        id="test-pack-related-h"
        data-testid="test-pack-related-heading"
        className="text-lg font-bold text-foreground"
      >
        {t("related_title")}
      </h2>
      <div
        data-testid="test-pack-related-grid"
        className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {picks.map((p) => (
          <TestPackCard key={p.slug} pack={p} />
        ))}
      </div>
    </section>
  );
}
