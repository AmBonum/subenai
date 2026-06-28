import { describe, it, expect } from "vitest";
import { filterAcademy } from "@/lib/academy/filter";
import type { AcademyListItem } from "@/lib/academy/queries";

const base = {
  hero_image_url: null,
  reading_minutes: 5,
  published_at: "2026-01-01",
  difficulty: null,
  estimated_minutes: null,
  hero_emoji: null,
  category: { slug: "phishing", name: "Phishing" },
  author: { slug: "ed", display_name: "Editorial" },
} as const;

const items: AcademyListItem[] = [
  {
    ...base,
    id: "1",
    slug: "a",
    title: "Phishing základy",
    excerpt: "...",
    content_type: "article",
  },
  { ...base, id: "2", slug: "b", title: "SMS podvody", excerpt: "...", content_type: "lesson" },
];

describe("filterAcademy", () => {
  it("filters by type", () => {
    expect(filterAcademy(items, { type: "lesson", query: "" }).map((i) => i.id)).toEqual(["2"]);
    expect(filterAcademy(items, { type: "article", query: "" }).map((i) => i.id)).toEqual(["1"]);
    expect(filterAcademy(items, { type: "all", query: "" })).toHaveLength(2);
  });

  it("matches the query against title/excerpt/category", () => {
    expect(filterAcademy(items, { type: "all", query: "sms" }).map((i) => i.id)).toEqual(["2"]);
    expect(filterAcademy(items, { type: "all", query: "základy" }).map((i) => i.id)).toEqual(["1"]);
    // category name match (both share "Phishing") returns both
    expect(filterAcademy(items, { type: "all", query: "phishing" })).toHaveLength(2);
  });
});
