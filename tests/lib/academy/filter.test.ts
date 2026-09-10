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
  {
    ...base,
    id: "3",
    slug: "c",
    title: "prompt injection",
    excerpt: "...",
    content_type: "article",
    difficulty: "advanced",
  },
  {
    ...base,
    id: "4",
    slug: "d",
    title: "AI pre odborníkov",
    excerpt: "...",
    content_type: "lesson",
    difficulty: "advanced",
  },
];

describe("filterAcademy", () => {
  it("filters by type", () => {
    expect(filterAcademy(items, { type: "lesson", query: "" }).map((i) => i.id)).toEqual([
      "2",
      "4",
    ]);
    expect(filterAcademy(items, { type: "article", query: "" }).map((i) => i.id)).toEqual([
      "1",
      "3",
    ]);
    expect(filterAcademy(items, { type: "all", query: "" })).toHaveLength(4);
  });

  it("matches the query against title/excerpt/category", () => {
    expect(filterAcademy(items, { type: "all", query: "sms" }).map((i) => i.id)).toEqual(["2"]);
    expect(filterAcademy(items, { type: "all", query: "základy" }).map((i) => i.id)).toEqual(["1"]);
    // category name match (all share "Phishing") returns everything
    expect(filterAcademy(items, { type: "all", query: "phishing" })).toHaveLength(4);
  });

  it("lane filter keeps the matching lane plus lane-less items", () => {
    expect(
      filterAcademy(items, { type: "all", query: "", lane: "advanced" }).map((i) => i.id),
    ).toEqual(["1", "2", "3", "4"]);
    expect(
      filterAcademy(items, { type: "all", query: "", lane: "beginner" }).map((i) => i.id),
    ).toEqual(["1", "2"]);
    expect(filterAcademy(items, { type: "all", query: "", lane: "all" })).toHaveLength(4);
  });

  it("applies the lane to lessons by their difficulty as well", () => {
    const advancedLesson = filterAcademy(items, { type: "lesson", query: "", lane: "advanced" });
    expect(advancedLesson.map((i) => i.id)).toEqual(["2", "4"]);
    const beginnerLesson = filterAcademy(items, { type: "lesson", query: "", lane: "beginner" });
    expect(beginnerLesson.map((i) => i.id)).toEqual(["2"]);
  });
});
