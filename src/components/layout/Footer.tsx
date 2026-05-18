import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useConsent } from "@/hooks/useConsent";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import changelog from "@/content/changelog.generated.json";
import { ROUTES } from "@/config/routes";
import { tFor } from "@/i18n/marketing";

const CURRENT_VERSION = (changelog as { version: string }[])[0]?.version ?? "—";

interface FooterLinkDef {
  to: string;
  labelKey: string;
  slug: string;
}

interface FooterColumnDef {
  titleKey: string;
  testid: string;
  links: FooterLinkDef[];
}

const COLUMN_DEFS: FooterColumnDef[] = [
  {
    titleKey: "columns.obsah.title",
    testid: "footer-column-obsah",
    links: [
      { to: ROUTES.test, labelKey: "columns.obsah.links.test", slug: "test" },
      { to: ROUTES.testy, labelKey: "columns.obsah.links.testy", slug: "testy" },
      { to: ROUTES.skolenia, labelKey: "columns.obsah.links.skolenia", slug: "skolenia" },
      { to: ROUTES.skoly, labelKey: "columns.obsah.links.skoly", slug: "skoly" },
    ],
  },
  {
    titleKey: "columns.projekt.title",
    testid: "footer-column-projekt",
    links: [
      { to: ROUTES.oProjecte, labelKey: "columns.projekt.links.o_projekte", slug: "o-projekte" },
      { to: ROUTES.kontakt, labelKey: "columns.projekt.links.kontakt", slug: "kontakt" },
      { to: ROUTES.podpora, labelKey: "columns.projekt.links.podpora", slug: "podpora" },
      { to: ROUTES.sponzori, labelKey: "columns.projekt.links.sponzori", slug: "sponzori" },
      { to: ROUTES.zmeny, labelKey: "columns.projekt.links.zmeny", slug: "zmeny" },
    ],
  },
  {
    titleKey: "columns.pravne.title",
    testid: "footer-column-pravne",
    links: [
      { to: ROUTES.privacy, labelKey: "columns.pravne.links.privacy", slug: "privacy" },
      { to: ROUTES.cookies, labelKey: "columns.pravne.links.cookies", slug: "cookies" },
      {
        to: ROUTES.spravovat,
        labelKey: "columns.pravne.links.spravovat_podporu",
        slug: "spravovat-podporu",
      },
    ],
  },
];

interface FooterSponsor {
  id: string;
  display_name: string;
  display_link: string | null;
}

// Module-level cache: footer_sponsors changes infrequently (only on new
// tier-qualifying donations) so multiple Footer mounts share one fetch.
let cachedSponsorsPromise: Promise<FooterSponsor[]> | null = null;

function loadFooterSponsors(): Promise<FooterSponsor[]> {
  if (!cachedSponsorsPromise) {
    // Supabase builder returns PromiseLike, not Promise — wrap so .catch/.finally are available.
    const p = Promise.resolve(
      supabase
        .from("footer_sponsors")
        .select("id, display_name, display_link")
        .order("created_at", { ascending: false })
        .limit(50),
    )
      .then(({ data, error }) => {
        if (error) {
          // Reset cache on error so next render retries.
          cachedSponsorsPromise = null;
          return [] as FooterSponsor[];
        }
        return (data ?? []) as FooterSponsor[];
      })
      .catch(() => {
        // Network-level errors (abort, DNS failure) — reset cache so next render retries.
        cachedSponsorsPromise = null;
        return [] as FooterSponsor[];
      });
    cachedSponsorsPromise = p;
    return p;
  }
  return cachedSponsorsPromise;
}

export function Footer() {
  const { openPreferences } = useConsent();
  const { isAuthenticated, isAdmin } = useAuth();
  const [sponsors, setSponsors] = useState<FooterSponsor[]>([]);
  const t = tFor("footer");

  useEffect(() => {
    let cancelled = false;
    loadFooterSponsors().then((rows) => {
      if (!cancelled) setSponsors(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <footer
      data-testid="footer-root"
      className="mx-auto mt-24 w-full max-w-5xl border-t border-border/60 pt-12 pb-8"
    >
      <div className="grid gap-10 text-center sm:grid-cols-2 sm:text-left md:grid-cols-4">
        <div className="flex flex-col items-center gap-3 sm:items-start">
          <Link
            to={ROUTES.home}
            data-testid="footer-logo-link"
            className="inline-flex items-center"
            aria-label={t("logo_aria")}
          >
            <img src="/logo.svg" alt="subenai" className="h-8 w-auto" />
          </Link>
          <p data-testid="footer-tagline" className="text-xs leading-relaxed text-muted-foreground">
            {t("tagline")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("made_with")}{" "}
            <a
              data-testid="footer-novejsi-link"
              href="https://www.youtube.com/watch?v=dbuCSt_k5c8"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              Novejši
            </a>{" "}
            ·{" "}
            <Link
              data-testid="footer-version-link"
              to={ROUTES.zmeny}
              className="font-mono hover:text-foreground transition-colors"
              aria-label={t("version_aria", { version: CURRENT_VERSION })}
            >
              v{CURRENT_VERSION}
            </Link>
          </p>
        </div>

        {COLUMN_DEFS.map((col) => (
          <FooterColumn
            key={col.testid}
            title={t(col.titleKey)}
            testid={col.testid}
            links={col.links.map((l) => ({ to: l.to, label: t(l.labelKey), slug: l.slug }))}
          />
        ))}

        {isAuthenticated && (
          <div data-testid="footer-platform-column" className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              {t("columns.platforma.title")}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  data-testid="footer-platform-link-app"
                  to="/app"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("columns.platforma.links.app")}
                </Link>
              </li>
              {isAdmin && (
                <li>
                  <Link
                    data-testid="footer-platform-link-admin"
                    to="/admin"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("columns.platforma.links.admin")}
                  </Link>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {sponsors.length > 0 ? (
        <div
          data-testid="footer-sponsor-strip"
          className="mt-10 border-t border-border/40 pt-6 text-center sm:text-left"
        >
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {t("sponsors.heading")}
          </h3>
          <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm sm:justify-start">
            {sponsors.map((s) => (
              <li key={s.id}>
                {s.display_link ? (
                  <a
                    data-testid={`footer-sponsor-link-${s.id}`}
                    href={s.display_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    {s.display_name}
                    <span aria-hidden="true" className="ml-1 text-muted-foreground">
                      ↗
                    </span>
                  </a>
                ) : (
                  <span data-testid={`footer-sponsor-link-${s.id}`} className="text-foreground">
                    {s.display_name}
                  </span>
                )}
              </li>
            ))}
            <li>
              <Link
                data-testid="footer-sponsor-all-link"
                to={ROUTES.sponzori}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("sponsors.all_link")}
              </Link>
            </li>
          </ul>
        </div>
      ) : null}

      <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/40 pt-6 sm:flex-row sm:items-center">
        <p data-testid="footer-copyright" className="text-xs text-muted-foreground">
          {t("copyright", { year: new Date().getFullYear() })}
        </p>
        <button
          data-testid="footer-cookies-button"
          type="button"
          onClick={openPreferences}
          className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          {t("cookies_button")}
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        powered by{" "}
        <a
          data-testid="footer-lvtesting-link"
          href="https://www.lvtesting.eu"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary transition-colors hover:text-foreground"
        >
          lvtesting.eu
        </a>
      </p>
    </footer>
  );
}

function FooterColumn({
  title,
  testid,
  links,
}: {
  title: string;
  testid: string;
  links: { to: string; label: string; slug: string }[];
}) {
  return (
    <div data-testid={testid} className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{title}</h3>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              data-testid={`footer-nav-link-${link.slug}`}
              to={link.to}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
