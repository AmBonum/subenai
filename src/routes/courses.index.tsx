import { createFileRoute } from "@tanstack/react-router";
import type { CourseJsonLdInput } from "@/lib/seo/courses-jsonld";
import { SITE_ORIGIN } from "@/config/site";
import { buildCoursesItemListJsonLd } from "@/lib/seo/courses-jsonld";
import { buildCoursesFaqJsonLd } from "@/lib/seo/courses-faq-schema";
import { tFor } from "@/i18n/quiz";

// E25 Phase 2 — /courses catalog senior redesign. The component +
// the ~177KB COURSES content registry live in courses.index.lazy.tsx
// so they stay out of the entry chunk. head() needs only the per-course
// SEO fields for its ItemList JSON-LD, so the loader dynamically imports
// the registry and projects it down to the light CourseJsonLdInput shape
// — the registry is fetched in the route's async chunk, not the entry.
//
// SEO: head() emits TWO JSON-LD blobs — ItemList (one ListItem per
// course) + FAQPage (5 Q&As). Per-course Course schema lives on the
// detail route, not repeated here (Google penalizes duplicate Course
// blobs).

export const Route = createFileRoute("/courses/")({
  loader: async (): Promise<CourseJsonLdInput[]> => {
    const { COURSES } = await import("@/content/courses");
    return COURSES.map((c) => ({
      slug: c.slug,
      title: c.title,
      tagline: c.tagline,
      estimatedMinutes: c.estimatedMinutes,
      publishedAt: c.publishedAt,
      updatedAt: c.updatedAt,
    }));
  },
  head: ({ loaderData }) => {
    const t = tFor("skolenia");
    const url = `${SITE_ORIGIN}/courses`;
    const courses = (loaderData ?? []) as CourseJsonLdInput[];
    return {
      meta: [
        { title: t("meta_title") },
        { name: "description", content: t("meta_description") },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { property: "og:title", content: t("meta_title") },
        { property: "og:description", content: t("og_description") },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { property: "og:locale", content: "sk_SK" },
        { property: "og:image", content: `${SITE_ORIGIN}/og-default.png` },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: `${SITE_ORIGIN}/og-default.png` },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(buildCoursesItemListJsonLd(courses, t("list_name"))),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(
            buildCoursesFaqJsonLd(
              (key) => t(`faq_${key}`),
              (key) => t(`faq_a${key.slice(1)}`),
            ),
          ),
        },
      ],
    };
  },
});
