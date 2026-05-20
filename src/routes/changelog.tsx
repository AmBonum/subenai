import { createFileRoute, Link } from "@tanstack/react-router";
import changelog from "@/content/changelog.generated.json";
import { SITE_ORIGIN } from "@/config/site";
import { tFor } from "@/i18n/marketing";

const PAGE_URL = `${SITE_ORIGIN}/changelog`;
const OG_IMAGE = `${SITE_ORIGIN}/og-default.png`;
const LOGO_URL = `${SITE_ORIGIN}/logo.svg`;
const MAX_JSONLD_ENTRIES = 10;
const tZmeny = tFor("marketing");

interface ChangelogEntry {
  version: string;
  date: string;
  added: string[];
  changed: string[];
  fixed: string[];
  removed: string[];
  deprecated: string[];
  security: string[];
}

const entries = changelog as ChangelogEntry[];
const latestEntry = entries[0];

type SectionKey = keyof Omit<ChangelogEntry, "version" | "date">;

function sectionLabel(t: ReturnType<typeof tFor>, key: SectionKey): string {
  switch (key) {
    case "added":
      return t("zmeny.kind_added");
    case "changed":
      return t("zmeny.kind_changed");
    case "fixed":
      return t("zmeny.kind_fixed");
    case "removed":
      return t("zmeny.kind_removed");
    case "deprecated":
      return t("zmeny.kind_deprecated");
    case "security":
      return t("zmeny.kind_security");
  }
}

const SECTION_KEYS: SectionKey[] = [
  "added",
  "changed",
  "fixed",
  "removed",
  "deprecated",
  "security",
];

// Chip text uses the full-saturation hue (light enough to clear ~7:1 against
// the dark card background). The previously-used `*-foreground` tokens are
// dark — designed for SOLID swatches — and rendered the chip labels nearly
// invisible on the 10–15 % tinted backgrounds.
const SECTION_TONE: Record<SectionKey, string> = {
  added: "border-success/50 bg-success/15 text-success",
  changed: "border-primary/50 bg-primary/15 text-primary",
  fixed: "border-warning/50 bg-warning/15 text-warning",
  removed: "border-destructive/50 bg-destructive/15 text-destructive",
  deprecated: "border-muted bg-muted text-muted-foreground",
  security: "border-destructive/60 bg-destructive/20 text-destructive",
};

const PUBLISHER = {
  "@type": "Organization",
  name: "am.bonum s. r. o.",
  url: SITE_ORIGIN,
  logo: { "@type": "ImageObject", url: LOGO_URL },
} as const;

const collectionJsonLd = {
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
  head: () => ({
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
      { type: "application/ld+json", children: JSON.stringify(collectionJsonLd) },
      { type: "application/ld+json", children: JSON.stringify(breadcrumbJsonLd) },
    ],
  }),
  component: ZmenyPage,
});

const FOCUS_RING =
  "rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function ZmenyPage() {
  const t = tFor("marketing");
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-10">
          <Link
            to="/"
            data-testid="changelog-back-home"
            aria-label={t("zmeny.back_home_aria")}
            className={`inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground ${FOCUS_RING}`}
          >
            <span aria-hidden>←</span> {t("zmeny.back_home")}
          </Link>
          <h1
            data-testid="changelog-heading"
            className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            {t("zmeny.title")}
          </h1>
          <p
            data-testid="changelog-lead"
            className="mt-3 text-base text-muted-foreground sm:text-lg"
          >
            {t("zmeny.lead")}
            {latestEntry ? (
              <>
                {t("zmeny.last_deploy_prefix")}
                <time dateTime={latestEntry.date}>{formatDate(latestEntry.date)}</time>
                {t("zmeny.last_deploy_version", { version: latestEntry.version })}
              </>
            ) : null}
          </p>
        </header>

        {entries.length === 0 ? (
          <p
            data-testid="changelog-empty"
            className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground"
          >
            {t("zmeny.empty")}
          </p>
        ) : (
          <ol data-testid="changelog-list" className="space-y-8" aria-label={t("zmeny.list_aria")}>
            {entries.map((entry) => (
              <VersionBlock key={entry.version} entry={entry} />
            ))}
          </ol>
        )}
      </main>
    </div>
  );
}

function VersionBlock({ entry }: { entry: ChangelogEntry }) {
  const t = tFor("marketing");
  const sections = SECTION_KEYS.filter((key) => entry[key].length > 0);
  const anchor = `v${entry.version}`;

  return (
    <li
      id={anchor}
      data-testid={`changelog-entry-${anchor}`}
      className="space-y-4 rounded-2xl border border-border/60 bg-card p-6 sm:p-8 scroll-mt-24"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="group text-xl font-bold text-foreground">
          <a
            href={`#${anchor}`}
            data-testid={`changelog-entry-permalink-${anchor}`}
            aria-label={t("zmeny.permalink_aria", { version: entry.version })}
            className={`inline-flex items-baseline gap-2 hover:underline underline-offset-2 ${FOCUS_RING}`}
          >
            subenai {entry.version}
            <span
              aria-hidden
              className="text-base font-normal text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            >
              #
            </span>
          </a>
        </h2>
        <time
          dateTime={entry.date}
          data-testid={`changelog-entry-date-${anchor}`}
          className="text-sm text-muted-foreground"
        >
          {formatDate(entry.date)}
        </time>
      </div>

      {sections.length === 0 ? (
        <p
          data-testid={`changelog-entry-empty-${anchor}`}
          className="text-sm text-muted-foreground"
        >
          {t("zmeny.empty_version")}
        </p>
      ) : (
        sections.map((key) => (
          <section
            key={key}
            data-testid={`changelog-section-${anchor}-${key}`}
            className="space-y-2"
          >
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span
                data-testid={`changelog-section-chip-${anchor}-${key}`}
                className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${SECTION_TONE[key]}`}
              >
                {sectionLabel(t, key)}
              </span>
            </h3>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-card-foreground">
              {entry[key].map((item, i) => (
                <li key={i} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
              ))}
            </ul>
          </section>
        ))
      )}
    </li>
  );
}

function formatDate(iso: string): string {
  // Parse YYYY-MM-DD as a local date, avoiding the UTC-midnight TZ shift that
  // `new Date("2026-05-20")` would introduce for users east of the meridian.
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return iso;
  const [y, m, d] = parts as [number, number, number];
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("sk-SK", { day: "numeric", month: "long", year: "numeric" });
}

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch] ?? ch);
}

function renderInline(value: string): string {
  // Allow a tiny safe subset of inline markdown: **bold**, *italic*, and
  // `code`. Everything is HTML-escaped first so a malformed/misescaped
  // changelog entry can never inject markup.
  return escapeHtml(value)
    .replace(
      /`([^`]+)`/g,
      (_, code) =>
        `<code class="rounded bg-muted px-1 py-0.5 text-xs text-foreground">${code}</code>`,
    )
    .replace(/\*\*([^*]+)\*\*/g, (_, bold) => `<strong class="text-foreground">${bold}</strong>`)
    .replace(/\*([^*]+)\*/g, (_, em) => `<em>${em}</em>`);
}

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
