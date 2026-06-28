// E55.3 — JSON-LD for academy entries. A lesson (content_type='lesson')
// emits a Course node; an article emits an Article node. Both carry a
// BreadcrumbList rooted at Academy. Mirrors the split that the separate
// /blog (Article) and /courses (Course) routes used before the merge.

import { SITE_ORIGIN } from "@/config/site";
import type { AcademyEntryDetail } from "@/lib/academy/queries";

const PUBLISHER = {
  "@type": "Organization",
  name: "am.bonum s. r. o.",
  url: SITE_ORIGIN,
} as const;

function breadcrumb(entry: Pick<AcademyEntryDetail, "slug" | "title">) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Akadémia", item: `${SITE_ORIGIN}/academy` },
      {
        "@type": "ListItem",
        position: 2,
        name: entry.title,
        item: `${SITE_ORIGIN}/academy/${entry.slug}`,
      },
    ],
  };
}

export function buildAcademyJsonLd(entry: AcademyEntryDetail): object {
  const url = `${SITE_ORIGIN}/academy/${entry.slug}`;
  const common = {
    "@context": "https://schema.org",
    inLanguage: "sk-SK",
    url,
    name: entry.seo_title ?? entry.title,
    description: entry.seo_description ?? entry.excerpt,
    publisher: PUBLISHER,
  };

  const main =
    entry.content_type === "lesson"
      ? {
          ...common,
          "@type": "Course",
          provider: PUBLISHER,
          ...(entry.estimated_minutes ? { timeRequired: `PT${entry.estimated_minutes}M` } : {}),
          ...(entry.difficulty ? { educationalLevel: entry.difficulty } : {}),
        }
      : {
          ...common,
          "@type": "Article",
          headline: entry.title,
          datePublished: entry.published_at,
          ...(entry.hero_image_url ? { image: entry.hero_image_url } : {}),
          author: { "@type": "Organization", name: "subenai", url: SITE_ORIGIN },
        };

  return { "@context": "https://schema.org", "@graph": [main, breadcrumb(entry)] };
}
