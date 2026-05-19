import { createFileRoute, Link } from "@tanstack/react-router";
import { Footer } from "@/components/layout/Footer";
import changelog from "@/content/changelog.generated.json";
import { SITE_ORIGIN } from "@/config/site";
import { tFor } from "@/i18n/marketing";

const PAGE_URL = `${SITE_ORIGIN}/changelog`;
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

const SECTION_TONE: Record<SectionKey, string> = {
  added: "border-success/40 bg-success/10 text-success-foreground",
  changed: "border-primary/40 bg-primary/10 text-foreground",
  fixed: "border-warning/40 bg-warning/10 text-warning-foreground",
  removed: "border-destructive/40 bg-destructive/10 text-foreground",
  deprecated: "border-muted bg-muted text-muted-foreground",
  security: "border-destructive/60 bg-destructive/15 text-foreground",
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  url: PAGE_URL,
  name: tZmeny("zmeny.jsonld_name"),
  itemListOrder: "https://schema.org/ItemListOrderDescending",
  itemListElement: entries.slice(0, 10).map((e, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "Article",
      headline: `subenai ${e.version}`,
      datePublished: e.date,
      url: `${PAGE_URL}#v${e.version}`,
    },
  })),
};

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: tZmeny("zmeny.meta_title") },
      { name: "description", content: tZmeny("zmeny.meta_description") },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: tZmeny("zmeny.meta_title") },
      { property: "og:url", content: PAGE_URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(articleJsonLd),
      },
    ],
  }),
  component: ZmenyPage,
});

function ZmenyPage() {
  const t = tFor("marketing");
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-10">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            {t("zmeny.back_home")}
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("zmeny.title")}
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            {t("zmeny.lead")}
            {entries[0] ? (
              <>
                {t("zmeny.last_deploy_prefix")}
                <time dateTime={entries[0].date}>{formatDate(entries[0].date)}</time>
                {t("zmeny.last_deploy_version", { version: entries[0].version })}
              </>
            ) : null}
          </p>
        </header>

        {entries.length === 0 ? (
          <p className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
            {t("zmeny.empty")}
          </p>
        ) : (
          <ol className="space-y-8" aria-label={t("zmeny.list_aria")}>
            {entries.map((entry) => (
              <VersionBlock key={entry.version} entry={entry} />
            ))}
          </ol>
        )}

        <Footer />
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
      className="space-y-4 rounded-2xl border border-border/60 bg-card p-6 sm:p-8 scroll-mt-24"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold text-foreground">
          <a href={`#${anchor}`} className="hover:underline underline-offset-2">
            subenai {entry.version}
          </a>
        </h2>
        <time dateTime={entry.date} className="text-sm text-muted-foreground">
          {formatDate(entry.date)}
        </time>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("zmeny.empty_version")}</p>
      ) : (
        sections.map((key) => (
          <section key={key} className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <span
                className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${SECTION_TONE[key]}`}
              >
                {sectionLabel(t, key)}
              </span>
            </h3>
            <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
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
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("sk-SK", { day: "numeric", month: "long", year: "numeric" });
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
      (_, code) => `<code class="rounded bg-muted px-1 py-0.5 text-xs">${code}</code>`,
    )
    .replace(/\*\*([^*]+)\*\*/g, (_, bold) => `<strong class="text-foreground">${bold}</strong>`)
    .replace(/\*([^*]+)\*/g, (_, em) => `<em>${em}</em>`);
}
