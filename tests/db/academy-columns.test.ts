import { describe, it, expect } from "vitest";
import type { Database } from "@/integrations/supabase/types";

// E55.1 — the academy merge stores lessons in blog_posts. Guard that the
// generated Supabase types carry the new columns, so the migration and the
// types stay in lock-step (CLAUDE.md: keep types.ts in sync with schema).
type BlogRow = Database["public"]["Tables"]["blog_posts"]["Row"];
type BlogInsert = Database["public"]["Tables"]["blog_posts"]["Insert"];

describe("academy columns on blog_posts", () => {
  it("Row carries content_type / difficulty / estimated_minutes / hero_emoji", () => {
    const probe: Pick<BlogRow, "content_type" | "difficulty" | "estimated_minutes" | "hero_emoji"> =
      {
        content_type: "lesson",
        difficulty: "beginner",
        estimated_minutes: 9,
        hero_emoji: "📧",
      };
    expect(probe.content_type).toBe("lesson");
    expect(probe.estimated_minutes).toBe(9);
  });

  it("Insert allows omitting the lesson-only columns (articles default to 'article')", () => {
    const article: BlogInsert = {
      slug: "x",
      category_id: "c",
      author_id: "a",
      title: "t",
      excerpt: "e",
      body_mdx: "b",
    };
    expect(article.content_type).toBeUndefined();
  });
});
