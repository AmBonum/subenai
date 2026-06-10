import { createFileRoute, notFound } from "@tanstack/react-router";
import { buildCourseJsonLd } from "@/lib/seo/course-jsonld";
import { buildBreadcrumbJsonLd } from "@/lib/seo/breadcrumb-jsonld";
import { SITE_ORIGIN } from "@/config/site";
import { tFor } from "@/i18n/quiz";
const COPYRIGHT_HOLDER = "subenai";

export const Route = createFileRoute("/courses/$slug")({
  // Dynamic import keeps the ~260KB course content registry out of the
  // entry chunk — it loads only when a course route is visited.
  loader: async ({ params }) => {
    const { getCourseBySlug } = await import("@/content/courses");
    const course = getCourseBySlug(params.slug);
    if (!course) throw notFound();
    return course;
  },
  head: ({ loaderData: course }) => {
    if (!course) return { meta: [] };
    const t = tFor("skolenia");
    const url = `${SITE_ORIGIN}/courses/${course.slug}`;
    return {
      meta: [
        { title: t("detail_meta_title", { title: course.title }) },
        { name: "description", content: course.tagline },
        { name: "author", content: COPYRIGHT_HOLDER },
        {
          name: "copyright",
          content: `© ${new Date(course.publishedAt).getFullYear()} ${COPYRIGHT_HOLDER}`,
        },
        { name: "robots", content: "index, follow, max-image-preview:large" },
        { name: "language", content: "sk-SK" },
        { property: "og:title", content: course.title },
        { property: "og:description", content: course.tagline },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:locale", content: "sk_SK" },
        { property: "og:site_name", content: "subenai" },
        { property: "og:image", content: `${SITE_ORIGIN}/og-default.png` },
        { property: "article:published_time", content: course.publishedAt },
        { property: "article:modified_time", content: course.updatedAt },
        { property: "article:author", content: COPYRIGHT_HOLDER },
        { property: "article:section", content: course.category },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: course.title },
        { name: "twitter:description", content: course.tagline },
        { name: "twitter:image", content: `${SITE_ORIGIN}/og-default.png` },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(buildCourseJsonLd(course)),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify(
            buildBreadcrumbJsonLd([
              { name: t("breadcrumb_home"), url: SITE_ORIGIN },
              { name: t("breadcrumb_courses"), url: `${SITE_ORIGIN}/courses` },
              { name: course.title, url },
            ]),
          ),
        },
      ],
    };
  },
});
