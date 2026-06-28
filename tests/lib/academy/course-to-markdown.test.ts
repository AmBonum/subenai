import { describe, it, expect } from "vitest";
import { courseToMarkdown } from "@/lib/academy/course-to-markdown";
import { parseAcademyBody } from "@/lib/academy/shortcodes";
import type { Course } from "@/content/courses";
import type { Visual } from "@/lib/quiz/bank/questions";

const visual: Visual = {
  kind: "email",
  from: "Banka",
  fromEmail: "x@banka-fake.online",
  subject: "Overte sa",
  body: "Telo.",
  cta: "Overiť",
};

const course: Course = {
  slug: "demo",
  title: "Demo",
  tagline: "Demo tagline.",
  category: "email",
  difficulty: "začiatočník",
  estimatedMinutes: 5,
  heroEmoji: "✉️",
  publishedAt: "2026-01-01",
  updatedAt: "2026-01-01",
  sections: [
    { kind: "intro", heading: "Úvod", body: "Úvodný text." },
    { kind: "example", heading: "Vzor", visual, commentary: "Komentár." },
    {
      kind: "checklist",
      heading: "Kontrola",
      items: [
        { good: true, text: "Dobré." },
        { good: false, text: "Zlé." },
      ],
    },
    { kind: "redflags", heading: "Vlajky", flags: ["Tlak na čas.", "Cudzia doména."] },
    { kind: "do_dont", heading: "Pravidlá", do: ["Rob A."], dont: ["Nerob B."] },
    { kind: "scenario", heading: "Scenár", story: "Príbeh.", right_action: "Správny krok." },
  ],
};

describe("courseToMarkdown", () => {
  it("renders each section kind into the expected Markdown", () => {
    const md = courseToMarkdown(course);
    expect(md).toContain("## Úvod\n\nÚvodný text.");
    expect(md).toContain("## Vzor\n\n[[visual:b64:");
    expect(md).toContain("\n\nKomentár.");
    expect(md).toContain("- ✅ Dobré.");
    expect(md).toContain("- ❌ Zlé.");
    expect(md).toContain("**Červená vlajka:** Tlak na čas.");
    expect(md).toContain("### ✅ Rob\n\n- Rob A.");
    expect(md).toContain("### ❌ Nerob\n\n- Nerob B.");
    expect(md).toContain("**Zlaté pravidlo:** Správny krok.");
  });

  it("produces a body the academy parser can round-trip back to the visual", () => {
    const blocks = parseAcademyBody(courseToMarkdown(course));
    const visualBlocks = blocks.filter((b) => b.kind === "visual");
    expect(visualBlocks).toHaveLength(1);
    expect(visualBlocks[0]).toEqual({ kind: "visual", visual });
  });
});
