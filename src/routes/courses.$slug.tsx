import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getCourseBySlug } from "@/content/courses";
import type { CourseSection } from "@/content/courses/_schema";
import { CourseHero } from "@/components/courses/CourseHero";
import { CourseSectionView } from "@/components/courses/sections/CourseSections";
import { RelatedAcademyArticleCard } from "@/components/courses/RelatedAcademyArticleCard";
import { RelatedCourses } from "@/components/courses/RelatedCourses";
import { Button } from "@/components/ui/button";
import { buildCourseJsonLd } from "@/lib/seo/course-jsonld";
import { SITE_ORIGIN } from "@/config/site";
import { tFor } from "@/i18n/quiz";
const COPYRIGHT_HOLDER = "subenai";

export const Route = createFileRoute("/courses/$slug")({
  loader: ({ params }) => {
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
        { property: "article:published_time", content: course.publishedAt },
        { property: "article:modified_time", content: course.updatedAt },
        { property: "article:author", content: COPYRIGHT_HOLDER },
        { property: "article:section", content: course.category },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: course.title },
        { name: "twitter:description", content: course.tagline },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(buildCourseJsonLd(course)),
        },
      ],
    };
  },
  component: CoursePage,
});

function CoursePage() {
  const t = tFor("skolenia");
  const tCommon = tFor("common");
  const course = Route.useLoaderData();
  const year = new Date(course.publishedAt).getFullYear();
  return (
    <article className="min-h-screen bg-background" itemScope itemType="https://schema.org/Course">
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-12 sm:pt-16">
        <CourseHero course={course} />

        {course.sections.map((section: CourseSection, idx: number) => (
          <CourseSectionView key={idx} section={section} idx={idx} />
        ))}

        {course.sources && course.sources.length > 0 ? (
          <section aria-labelledby="sources-h" className="mt-12 border-t border-border/60 pt-6">
            <h2
              id="sources-h"
              className="text-sm font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {tCommon("sources")}
            </h2>
            <ul className="mt-3 space-y-1 text-sm" role="list">
              {course.sources.map((s: { label: string; url: string }, i: number) => (
                <li key={i}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-12 flex flex-wrap gap-3 print:hidden">
          <Button asChild>
            <Link to="/test">{t("detail_cta_test")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/courses">{t("detail_cta_back")}</Link>
          </Button>
        </div>

        {/* E17.3 — reverse cross-link from active training back into
            the editorial long-form. Renders ONLY when a blog post has
            related_course_slug pointing at this course's slug. */}
        <RelatedAcademyArticleCard courseSlug={course.slug} />

        <RelatedCourses current={course} />

        <p className="mt-10 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
          {t("detail_copyright", { year, holder: COPYRIGHT_HOLDER })}
        </p>
      </main>
    </article>
  );
}
