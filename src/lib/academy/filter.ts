// E55.3 — pure filtering for the academy index, extracted so the matching
// logic is unit-testable without a DB or React.

import type { AcademyListItem } from "@/lib/academy/queries";

export type AcademyTypeFilter = "all" | "article" | "lesson";

export interface AcademyFilters {
  type: AcademyTypeFilter;
  query: string;
}

export function filterAcademy(
  items: readonly AcademyListItem[],
  { type, query }: AcademyFilters,
): AcademyListItem[] {
  const q = query.trim().toLowerCase();
  return items.filter((item) => {
    if (type !== "all" && item.content_type !== type) return false;
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.excerpt.toLowerCase().includes(q) ||
      item.category.name.toLowerCase().includes(q)
    );
  });
}
