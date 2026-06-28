import type { Course, CourseSection } from "@/content/courses";
import { encodeVisual } from "@/lib/academy/visual-shortcode";

// E55.4 — deterministic converter: a structured course (intro / example /
// checklist / redflags / do_dont / scenario sections) → the Markdown +
// shortcode body stored in `blog_posts.body_mdx` and rendered by AcademyBody.
//
// Fidelity map (the receiving renderer is BlogPostBody + the academy
// shortcode pre-pass):
//   intro      → ## heading + prose paragraph
//   example    → ## heading + [[visual:…]] mockup + commentary paragraph
//   checklist  → ## heading + list with ✅ / ❌ leaders
//   redflags   → ## heading + "**Červená vlajka:** …" paragraphs → 🚩 callouts
//   do_dont    → ## heading + "### ✅ Rob" / "### ❌ Nerob" bullet lists
//   scenario   → ## heading + story + "**Zlaté pravidlo:** …" ⭐ callout
//
// Pure and side-effect free so it can be golden-tested and run from the
// SQL generator.

function sectionToMarkdown(section: CourseSection): string {
  const h = `## ${section.heading}`;
  switch (section.kind) {
    case "intro":
      return `${h}\n\n${section.body.trim()}`;
    case "example":
      return `${h}\n\n${encodeVisual(section.visual)}\n\n${section.commentary.trim()}`;
    case "checklist":
      return `${h}\n\n${section.items
        .map((item) => `- ${item.good ? "✅" : "❌"} ${item.text.trim()}`)
        .join("\n")}`;
    case "redflags":
      return `${h}\n\n${section.flags
        .map((flag) => `**Červená vlajka:** ${flag.trim()}`)
        .join("\n\n")}`;
    case "do_dont":
      return [
        h,
        "### ✅ Rob",
        section.do.map((item) => `- ${item.trim()}`).join("\n"),
        "### ❌ Nerob",
        section.dont.map((item) => `- ${item.trim()}`).join("\n"),
      ].join("\n\n");
    case "scenario":
      return `${h}\n\n${section.story.trim()}\n\n**Zlaté pravidlo:** ${section.right_action.trim()}`;
  }
}

export function courseToMarkdown(course: Course): string {
  return course.sections.map(sectionToMarkdown).join("\n\n");
}
