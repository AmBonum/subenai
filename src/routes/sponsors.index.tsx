import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { formatMonthYear } from "@/lib/sponsors";
import { SITE_ORIGIN, CONTACT_EMAIL } from "@/config/site";
import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";
const tSponzori = tFor("sponzori");
const SPONZORI_URL = `${SITE_ORIGIN}/sponsors`;
const HOMEPAGE_LIMIT = 5;

export interface PublicSponsor {
  id: string;
  display_name: string;
  display_link: string | null;
  display_message: string | null;
  created_at: string;
  has_refund: boolean;
}

export const Route = createFileRoute("/sponsors/")({
  head: () => ({
    meta: [
      { title: tSponzori("head_title") },
      { name: "description", content: tSponzori("head_description_index") },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: tSponzori("head_title") },
      { property: "og:url", content: SPONZORI_URL },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: SPONZORI_URL }],
  }),
  component: SponzoriPage,
});

function SponzoriPage() {
  return <SponzoriView fetchSponsors={fetchLatestSponsors} />;
}

interface SponzoriViewProps {
  fetchSponsors: () => Promise<PublicSponsor[]>;
}

export function SponzoriView({ fetchSponsors }: SponzoriViewProps) {
  const t = tFor("sponzori");
  const [state, setState] = useState<
    { kind: "loading" } | { kind: "ready"; sponsors: PublicSponsor[] } | { kind: "error" }
  >({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetchSponsors()
      .then((sponsors) => {
        if (!cancelled) setState({ kind: "ready", sponsors });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [fetchSponsors]);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
        <header className="mb-10">
          <Link to={ROUTES.home} className="text-sm text-muted-foreground hover:text-foreground">
            {t("back_home")}
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-3 text-base text-muted-foreground sm:text-lg">
            {t("hero_prefix")}
            <Link
              to={ROUTES.oProjecte}
              className="underline underline-offset-2 hover:text-foreground"
            >
              {t("hero_link_about")}
            </Link>
            .
          </p>
        </header>

        {state.kind === "loading" ? (
          <SponsorsLoading />
        ) : state.kind === "error" ? (
          <SponsorsError />
        ) : state.sponsors.length === 0 ? (
          <SponsorsEmpty />
        ) : (
          <LatestList sponsors={state.sponsors} />
        )}

        <p className="mt-12 text-center text-xs text-muted-foreground">
          {t("footer_note")}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </main>
    </div>
  );
}

function LatestList({ sponsors }: { sponsors: PublicSponsor[] }) {
  const t = tFor("sponzori");
  return (
    <section aria-labelledby="latest-h" className="space-y-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="latest-h" className="text-base font-semibold text-foreground">
          {sponsors.length === 1
            ? t("list_heading_one")
            : t("list_heading_many", { count: sponsors.length })}
        </h2>
        <Link
          to={ROUTES.sponzoriVsetci}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline underline-offset-2"
        >
          {t("all_link")} <span aria-hidden="true">→</span>
        </Link>
      </div>

      <Accordion
        type="multiple"
        className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 px-5"
        aria-label={t("list_aria")}
      >
        {sponsors.map((s) => (
          <AccordionItem
            key={s.id}
            value={s.id}
            className="border-b border-border/40 last:border-b-0"
          >
            <AccordionTrigger className="flex-wrap text-left">
              <div className="flex flex-1 items-baseline justify-between gap-4 pr-3">
                <span
                  className={`text-base font-semibold ${
                    s.has_refund ? "text-muted-foreground line-through" : "text-foreground"
                  }`}
                >
                  {s.display_name}
                </span>
                <div className="flex shrink-0 items-baseline gap-2">
                  {s.has_refund ? (
                    <span
                      data-testid="sponzori-refund-badge"
                      className="rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-[11px] font-normal text-muted-foreground"
                    >
                      {t("refund_badge")}
                    </span>
                  ) : null}
                  <time
                    dateTime={s.created_at}
                    className="text-xs font-normal text-muted-foreground"
                  >
                    {formatMonthYear(s.created_at)}
                  </time>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
              {s.has_refund ? (
                <p className="mb-2 italic text-muted-foreground/80">{t("refund_note")}</p>
              ) : null}
              {s.display_message ? (
                <p className="mb-2">„{s.display_message}"</p>
              ) : (
                <p className="mb-2 italic text-muted-foreground/70">{t("no_message")}</p>
              )}
              {s.display_link ? (
                <a
                  href={s.display_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline underline-offset-2"
                >
                  {s.display_link.replace(/^https?:\/\//, "")}
                  <span aria-hidden="true">↗</span>
                </a>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function SponsorsLoading() {
  const t = tFor("sponzori");
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("loading")}</p>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-xl border border-border/40 bg-card/40"
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function SponsorsError() {
  const t = tFor("sponzori");
  return (
    <div
      role="alert"
      className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground"
    >
      {t("fetch_error")}
    </div>
  );
}

function SponsorsEmpty() {
  const t = tFor("sponzori");
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
      <h2 className="text-xl font-semibold text-foreground">{t("empty_title")}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("empty_body")}</p>
      <div className="mt-4">
        <Link
          to={ROUTES.podpora}
          className="inline-flex items-center gap-2 rounded-2xl bg-accent-gradient px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow"
        >
          {t("empty_cta")}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

async function fetchLatestSponsors(): Promise<PublicSponsor[]> {
  const { data, error } = await supabase
    .from("public_sponsors")
    .select("id, display_name, display_link, display_message, created_at, has_refund")
    .order("created_at", { ascending: false })
    .limit(HOMEPAGE_LIMIT);

  if (error) throw new Error(`public_sponsors fetch failed: ${error.message}`);
  return (data ?? []) as PublicSponsor[];
}
