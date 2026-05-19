// E25 Phase 2 — schema.org Course JSON-LD builder.
//
// Until now /courses emitted only an ItemList referencing each
// course by URL + title. Schema.org has a proper Course type that
// surfaces richer information (provider, free flag, time required,
// audience). For an "Akadémia"-style site, Course schema unlocks
// "Course" rich-result eligibility in Google search.
//
// Decoupled from data layer: the builder takes a minimal shape so
// it stays unit-testable without booting the Course content modules.

import { SITE_ORIGIN } from "@/config/site";

export interface CourseJsonLdInput {
  slug: string;
  title: string;
  tagline: string;
  estimatedMinutes: number;
  publishedAt: string;
  updatedAt: string;
}

/** Build a schema.org `Course` JSON-LD blob for a single course.
 *
 * `provider` is hard-coded to the project — these are first-party
 * courses, not aggregated. `isAccessibleForFree` and `offers.price`
 * are the canonical "free" signal Google uses for the Course rich
 * result; both must be present to actually render the "Free" badge. */
export function buildCourseJsonLd(course: CourseJsonLdInput): Record<string, unknown> {
  const url = `${SITE_ORIGIN}/courses/${course.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.tagline,
    url,
    inLanguage: "sk-SK",
    isAccessibleForFree: true,
    timeRequired: `PT${course.estimatedMinutes}M`,
    datePublished: course.publishedAt,
    dateModified: course.updatedAt,
    provider: {
      "@type": "Organization",
      name: "subenai",
      url: SITE_ORIGIN,
    },
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `PT${course.estimatedMinutes}M`,
    },
  };
}

/** Build the ItemList wrapper that contains all Course blobs.
 *
 * Google supports nested ListItem → Course for catalog pages; this
 * shape signals "browse list of free courses". */
export function buildCoursesItemListJsonLd(
  courses: CourseJsonLdInput[],
  listName: string,
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    itemListElement: courses.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_ORIGIN}/courses/${c.slug}`,
      name: c.title,
    })),
  };
}
