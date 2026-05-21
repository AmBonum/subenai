// E44 Phase D — JSON-LD builders for /sablony hub + /sablony/$slug detail.
// Two helpers per appendix A:
//   - buildSablonyCollectionAndListJsonLd → emits CollectionPage + ItemList
//     in a single array (Google parses arrays of blobs at <script>).
//   - buildTemplateCreativeWorkJsonLd → CreativeWork schema for each
//     individual template page (license, audience, free flag).
//
// All Slovak-facing text is verbatim from tasks/E44-appendix-A.md so the
// strings the tests assert against match the marketing/legal contract.

import { SITE_ORIGIN } from "@/config/site";

export interface SablonyListItem {
  slug: string;
  title: string;
}

export function buildSablonyCollectionAndListJsonLd(
  items: SablonyListItem[],
): Record<string, unknown>[] {
  const collection = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Test šablóny: bezplatné kvízy o online podvodoch",
    description:
      "Verejná knižnica šablón kvízov o online bezpečnosti — phishing, falošné e-shopy, AI deepfake. Slovenčina, zadarmo, CC BY 4.0.",
    url: `${SITE_ORIGIN}/sablony`,
    inLanguage: "sk-SK",
    isPartOf: {
      "@type": "WebSite",
      name: "subenai",
      url: SITE_ORIGIN,
    },
    about: { "@type": "Thing", name: "Online safety quizzes" },
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Test šablóny",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_ORIGIN}/sablony/${it.slug}`,
      name: it.title,
    })),
  };

  return [collection, itemList];
}

export interface TemplateJsonLdInput {
  slug: string;
  title: string;
  description: string | null;
  publishedAt: string | null;
  updatedAt: string;
  authorDisplayName: string | null;
  ageRating: "all" | "thirteen_plus" | "sixteen_plus" | "eighteen_plus";
}

const AUDIENCE_TYPE: Record<TemplateJsonLdInput["ageRating"], string> = {
  all: "general public",
  thirteen_plus: "teens 13+",
  sixteen_plus: "teens 16+",
  eighteen_plus: "adults",
};

export function buildTemplateCreativeWorkJsonLd(t: TemplateJsonLdInput): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: t.title,
    description: t.description ?? "",
    url: `${SITE_ORIGIN}/sablony/${t.slug}`,
    inLanguage: "sk-SK",
    datePublished: t.publishedAt ?? t.updatedAt,
    dateModified: t.updatedAt,
    license: "https://creativecommons.org/licenses/by/4.0/",
    author: {
      "@type": "Person",
      name: t.authorDisplayName ?? "subenai",
    },
    publisher: {
      "@type": "Organization",
      name: "subenai",
      url: SITE_ORIGIN,
    },
    audience: {
      "@type": "Audience",
      audienceType: AUDIENCE_TYPE[t.ageRating],
    },
    isAccessibleForFree: true,
    learningResourceType: "Quiz",
    educationalUse: "Awareness training",
  };
}
