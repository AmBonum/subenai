import { createFileRoute } from "@tanstack/react-router";
import { SITE_ORIGIN } from "@/config/site";
import { tFor } from "@/i18n/marketing";

const PAGE_URL = `${SITE_ORIGIN}/changelog`;
const OG_IMAGE = `${SITE_ORIGIN}/og-default.png`;
const LOGO_URL = `${SITE_ORIGIN}/logo.svg`;
const MAX_JSONLD_ENTRIES = 10;
const tZmeny = tFor("marketing");

export interface ChangelogEntry {
  version: string;
  date: string;
  added: string[];
  changed: string[];
  fixed: string[];
  removed: string[];
  deprecated: string[];
  security: string[];
}

const PUBLISHER = {
  "@type": "Organization",
  name: "am.bonum s. r. o.",
  url: SITE_ORIGIN,
  logo: { "@type": "ImageObject", url: LOGO_URL },
} as const;

// Plain-text projection of a single changelog bullet for the JSON-LD
// `description` field — markdown markers are stripped so the schema string is
// human-readable in Google's rich-result preview.
function stripMarkdown(value: string): string {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function buildCollectionJsonLd(entries: ChangelogEntry[]): Record<string, unknown> {
  const latestEntry = entries[0];
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": PAGE_URL,
    url: PAGE_URL,
    name: tZmeny("zmeny.jsonld_name"),
    description: tZmeny("zmeny.jsonld_description"),
    inLanguage: "sk-SK",
    isPartOf: { "@type": "WebSite", name: "subenai", url: SITE_ORIGIN },
    publisher: PUBLISHER,
    ...(latestEntry ? { dateModified: latestEntry.date } : {}),
    mainEntity: {
      "@type": "ItemList",
      itemListOrder: "https://schema.org/ItemListOrderDescending",
      numberOfItems: entries.length,
      itemListElement: entries.slice(0, MAX_JSONLD_ENTRIES).map((e, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "TechArticle",
          headline: `subenai ${e.version}`,
          datePublished: e.date,
          url: `${PAGE_URL}#v${e.version}`,
          inLanguage: "sk-SK",
          author: PUBLISHER,
          publisher: PUBLISHER,
          description:
            stripMarkdown(e.added[0] ?? e.changed[0] ?? e.fixed[0] ?? "") ||
            `Verzia subenai ${e.version}.`,
        },
      })),
    },
  };
}

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: tZmeny("zmeny.breadcrumb_home"),
      item: SITE_ORIGIN,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: tZmeny("zmeny.breadcrumb_self"),
      item: PAGE_URL,
    },
  ],
};

export const Route = createFileRoute("/changelog")({
  // Dynamic import keeps the generated changelog JSON (~24KB) out of
  // the entry chunk; head() reads it via loaderData.
  loader: async (): Promise<ChangelogEntry[]> =>
    (await import("@/content/changelog.generated.json")).default as ChangelogEntry[],
  head: ({ loaderData }) => ({
    meta: [
      { title: tZmeny("zmeny.meta_title") },
      { name: "description", content: tZmeny("zmeny.meta_description") },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: tZmeny("zmeny.meta_title") },
      { property: "og:description", content: tZmeny("zmeny.meta_description") },
      { property: "og:url", content: PAGE_URL },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "subenai" },
      { property: "og:locale", content: "sk_SK" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: tZmeny("zmeny.og_image_alt") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: tZmeny("zmeny.meta_title") },
      { name: "twitter:description", content: tZmeny("zmeny.meta_description") },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(buildCollectionJsonLd(loaderData ?? [])),
      },
      { type: "application/ld+json", children: JSON.stringify(breadcrumbJsonLd) },
    ],
  }),
});
