import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useConsent } from "@/hooks/useConsent";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import changelog from "@/content/changelog.generated.json";
import { ROUTES } from "@/config/routes";

const CURRENT_VERSION = (changelog as { version: string }[])[0]?.version ?? "—";

interface FooterLink {
  to: string;
  label: string;
  slug: string;
}

const COLUMNS: { title: string; testid: string; links: FooterLink[] }[] = [
  {
    title: "Obsah",
    testid: "footer-column-obsah",
    links: [
      { to: ROUTES.test, label: "Spustiť test", slug: "test" },
      { to: ROUTES.testy, label: "Sada testov", slug: "testy" },
      { to: ROUTES.skolenia, label: "Školenia", slug: "skolenia" },
      { to: ROUTES.skoly, label: "Pre školy", slug: "skoly" },
    ],
  },
  {
    title: "Projekt",
    testid: "footer-column-projekt",
    links: [
      { to: ROUTES.oProjecte, label: "O projekte", slug: "o-projekte" },
      { to: ROUTES.kontakt, label: "Kontakt", slug: "kontakt" },
      { to: ROUTES.podpora, label: "Podporiť projekt", slug: "podpora" },
      { to: ROUTES.sponzori, label: "Sponzori", slug: "sponzori" },
      { to: ROUTES.zmeny, label: "Zmeny a verzie", slug: "zmeny" },
    ],
  },
  {
    title: "Právne",
    testid: "footer-column-pravne",
    links: [
      { to: ROUTES.privacy, label: "Súkromie", slug: "privacy" },
      { to: ROUTES.cookies, label: "Cookies", slug: "cookies" },
      { to: ROUTES.spravovat, label: "Spravovať podporu (sponzori)", slug: "spravovat-podporu" },
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
            aria-label="subenai — domov"
          >
            <img src="/logo.svg" alt="subenai" className="h-8 w-auto" />
          </Link>
          <p data-testid="footer-tagline" className="text-xs leading-relaxed text-muted-foreground">
            Bezplatný edukatívny nástroj pre slovenský digitálny svet.
          </p>
          <p className="text-xs text-muted-foreground">
            spravené s 🍺 v{" "}
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
              aria-label={`Aktuálna verzia v${CURRENT_VERSION} — zoznam zmien`}
            >
              v{CURRENT_VERSION}
            </Link>
          </p>
        </div>

        {COLUMNS.map((col) => (
          <FooterColumn key={col.title} title={col.title} testid={col.testid} links={col.links} />
        ))}

        {isAuthenticated && (
          <div data-testid="footer-platform-column" className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Platforma
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  data-testid="footer-platform-link-app"
                  to="/app"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Tvorba testov
                </Link>
              </li>
              {isAdmin && (
                <li>
                  <Link
                    data-testid="footer-platform-link-admin"
                    to="/admin"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Administrácia
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
            Vďaka top sponzorom
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
                všetci sponzori →
              </Link>
            </li>
          </ul>
        </div>
      ) : null}

      <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/40 pt-6 sm:flex-row sm:items-center">
        <p data-testid="footer-copyright" className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} subenai · Všetky práva vyhradené.
        </p>
        <button
          data-testid="footer-cookies-button"
          type="button"
          onClick={openPreferences}
          className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          Nastavenia cookies
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
  links: FooterLink[];
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
