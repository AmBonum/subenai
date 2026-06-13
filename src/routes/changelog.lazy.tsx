import { useEffect, useState } from "react";
import { createLazyFileRoute, Link } from "@tanstack/react-router";
import * as Accordion from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { tFor } from "@/i18n/marketing";
import { formatDateLongSk } from "@/lib/format/date";
import type { ChangelogEntry } from "./changelog";

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

// Badge palette. The text uses the full-saturation semantic hue, which is dark
// in the light theme and light in the dark theme — clearing AA against the
// matching 12 % tint in both. The leading dot is the solid hue at full
// strength so the category reads at a glance even before the label.
const SECTION_TONE: Record<SectionKey, { chip: string; dot: string }> = {
  added: { chip: "border-success/40 bg-success/12 text-success", dot: "bg-success" },
  changed: { chip: "border-primary/40 bg-primary/12 text-primary", dot: "bg-primary" },
  fixed: { chip: "border-warning/45 bg-warning/12 text-warning", dot: "bg-warning" },
  removed: {
    chip: "border-destructive/40 bg-destructive/12 text-destructive",
    dot: "bg-destructive",
  },
  deprecated: {
    chip: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  security: {
    chip: "border-destructive/55 bg-destructive/15 text-destructive",
    dot: "bg-destructive",
  },
};

export const Route = createLazyFileRoute("/changelog")({
  component: ZmenyPage,
});

const FOCUS_RING =
  "rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function ZmenyPage() {
  const t = tFor("marketing");
  const entries: ChangelogEntry[] = Route.useLoaderData();
  const latestEntry = entries[0];
  // Single-open accordion: the newest version is expanded by default; opening
  // another collapses it (only one panel open at a time). `collapsible` lets
  // the user close all of them.
  const [open, setOpen] = useState(latestEntry ? `v${latestEntry.version}` : "");

  // Deep links (/changelog#v1.14.4) open and scroll to the targeted version
  // even though it is collapsed by default. Listening for `hashchange` (not
  // just mount) also handles in-page permalink clicks and back/forward, which
  // are same-document navigations that never remount this component.
  useEffect(() => {
    const openFromHash = () => {
      const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (hash && entries.some((e) => `v${e.version}` === hash)) {
        setOpen(hash);
        requestAnimationFrame(() => {
          document.getElementById(hash)?.scrollIntoView({ block: "start" });
        });
      }
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, [entries]);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-20">
        <header className="mb-14">
          <Link
            to="/"
            data-testid="changelog-back-home"
            aria-label={t("zmeny.back_home_aria")}
            className={`inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground ${FOCUS_RING}`}
          >
            <span aria-hidden>←</span> {t("zmeny.back_home")}
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {t("zmeny.kicker")}
          </p>
          <h1
            data-testid="changelog-heading"
            className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl"
          >
            {t("zmeny.title")}
          </h1>
          <p
            data-testid="changelog-lead"
            className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            {t("zmeny.lead")}
            {latestEntry ? (
              <>
                {t("zmeny.last_deploy_prefix")}
                <time className="text-foreground" dateTime={latestEntry.date}>
                  {formatDate(latestEntry.date)}
                </time>
                {t("zmeny.last_deploy_version", { version: latestEntry.version })}
              </>
            ) : null}
          </p>
        </header>

        {entries.length === 0 ? (
          <p
            data-testid="changelog-empty"
            className="rounded-2xl border border-border/60 bg-card p-8 text-center text-sm text-muted-foreground"
          >
            {t("zmeny.empty")}
          </p>
        ) : (
          <Accordion.Root type="single" collapsible value={open} onValueChange={setOpen} asChild>
            <ol
              data-testid="changelog-list"
              aria-label={t("zmeny.list_aria")}
              className="relative ms-2 border-s border-border/70 sm:ms-3"
            >
              {entries.map((entry, i) => (
                <VersionBlock
                  key={entry.version}
                  entry={entry}
                  isLatest={i === 0}
                  index={i}
                  onOpen={setOpen}
                />
              ))}
            </ol>
          </Accordion.Root>
        )}
      </main>
    </div>
  );
}

function VersionBlock({
  entry,
  isLatest,
  index,
  onOpen,
}: {
  entry: ChangelogEntry;
  isLatest: boolean;
  index: number;
  onOpen: (value: string) => void;
}) {
  const t = tFor("marketing");
  const sections = SECTION_KEYS.filter((key) => entry[key].length > 0);
  const anchor = `v${entry.version}`;
  const summaryAria =
    sections.length > 0
      ? `${t("zmeny.summary_aria")}: ${sections.map((key) => sectionLabel(t, key)).join(", ")}`
      : t("zmeny.empty_version");

  return (
    <Accordion.Item value={anchor} asChild>
      <li
        id={anchor}
        data-testid={`changelog-entry-${anchor}`}
        style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
        className="group/item relative scroll-mt-24 ps-7 pb-8 last:pb-0 motion-safe:animate-[changelog-rise_0.5s_ease-out_both] sm:ps-10"
      >
        <span
          aria-hidden
          className={`absolute -start-[6.5px] top-5 size-3 rounded-full ring-4 ring-background ${
            isLatest ? "bg-primary" : "border-2 border-border bg-card"
          }`}
        />

        <a
          href={`#${anchor}`}
          data-testid={`changelog-entry-permalink-${anchor}`}
          aria-label={t("zmeny.permalink_aria", { version: entry.version })}
          onClick={() => onOpen(anchor)}
          className={`absolute end-0 top-5 text-base text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100 group-focus-within/item:opacity-100 ${FOCUS_RING}`}
        >
          #
        </a>

        <Accordion.Header className="flex">
          <Accordion.Trigger
            data-testid={`changelog-entry-trigger-${anchor}`}
            className={`group/trigger flex w-full items-start gap-3 py-4 pe-6 text-left [&[data-state=open]_.cl-chevron]:rotate-180 ${FOCUS_RING}`}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="rounded-md border border-border/70 bg-muted/60 px-2 py-0.5 font-mono text-sm font-semibold text-foreground transition-colors group-hover/trigger:border-primary/50">
                  {entry.version}
                </span>
                {isLatest ? (
                  <span
                    data-testid={`changelog-entry-latest-${anchor}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/12 px-2.5 py-0.5 text-xs font-semibold text-primary"
                  >
                    <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                    {t("zmeny.latest_badge")}
                  </span>
                ) : null}
              </span>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <time
                  dateTime={entry.date}
                  data-testid={`changelog-entry-date-${anchor}`}
                  className="text-sm font-medium text-muted-foreground"
                >
                  {formatDate(entry.date)}
                </time>
                {sections.length > 0 ? (
                  <span className="flex items-center gap-1.5" aria-label={summaryAria}>
                    {sections.map((key) => (
                      <span
                        key={key}
                        aria-hidden
                        title={sectionLabel(t, key)}
                        className={`size-2 rounded-full ${SECTION_TONE[key].dot}`}
                      />
                    ))}
                  </span>
                ) : null}
              </span>
            </span>
            <ChevronDown
              aria-hidden
              className="cl-chevron mt-1 size-4 shrink-0 text-muted-foreground transition-transform duration-200"
            />
          </Accordion.Trigger>
        </Accordion.Header>

        {/* No height keyframe here: the shared `accordion-down` animation
            leaves the panel clipped at height:0 once it settles (fill-mode
            none reverts the animated height). Radix mounts/unmounts the
            region on toggle, which is all we need; the entry-level
            `changelog-rise` keeps the motion polish. */}
        <Accordion.Content className="motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0">
          {sections.length === 0 ? (
            <p
              data-testid={`changelog-entry-empty-${anchor}`}
              className="pb-2 text-sm italic text-muted-foreground"
            >
              {t("zmeny.empty_version")}
            </p>
          ) : (
            <div className="space-y-5 pb-2">
              {sections.map((key) => (
                <section
                  key={key}
                  data-testid={`changelog-section-${anchor}-${key}`}
                  className="space-y-2.5"
                >
                  <h3>
                    <span
                      data-testid={`changelog-section-chip-${anchor}-${key}`}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide ${SECTION_TONE[key].chip}`}
                    >
                      <span
                        aria-hidden
                        className={`size-1.5 rounded-full ${SECTION_TONE[key].dot}`}
                      />
                      {sectionLabel(t, key)}
                    </span>
                  </h3>
                  <ul className="space-y-2 text-sm leading-relaxed text-card-foreground">
                    {entry[key].map((item, i) => (
                      <li key={i} className="flex gap-2.5">
                        <span
                          aria-hidden
                          className="mt-[0.5em] size-1 shrink-0 rounded-full bg-muted-foreground/50"
                        />
                        <span dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Accordion.Content>
      </li>
    </Accordion.Item>
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
  return formatDateLongSk(dt);
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
        `<code class="rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground">${code}</code>`,
    )
    .replace(
      /\*\*([^*]+)\*\*/g,
      (_, bold) => `<strong class="font-semibold text-foreground">${bold}</strong>`,
    )
    .replace(/\*([^*]+)\*/g, (_, em) => `<em>${em}</em>`);
}
