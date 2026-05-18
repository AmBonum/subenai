import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from "@/components/ui/sheet";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { to: ROUTES.testy, label: "Testy", slug: "testy" },
  { to: ROUTES.skolenia, label: "Školenia", slug: "skolenia" },
  { to: ROUTES.podpora, label: "Podporiť projekt", slug: "podpora" },
  { to: ROUTES.kontakt, label: "Kontakt", slug: "kontakt" },
] as const;

const CTA_ITEM = {
  to: ROUTES.test,
  labelShort: "Spustiť test",
  labelLong: "Spustiť rýchly test",
} as const;

export function SiteHeader() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Most-specific match wins so nested routes (e.g. /testy/eshop)
  // highlight only the deepest registered nav entry instead of every prefix.
  const activeTo = NAV_ITEMS.reduce<string | null>((acc, item) => {
    const matches = pathname === item.to || pathname.startsWith(item.to + "/");
    if (!matches) return acc;
    if (!acc || item.to.length > acc.length) return item.to;
    return acc;
  }, null);

  return (
    <header
      data-testid="header-root"
      className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <nav
        data-testid="header-nav"
        aria-label="Hlavná navigácia"
        className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:py-4"
      >
        <Link
          to={ROUTES.home}
          data-testid="header-logo-link"
          className="flex items-center"
          aria-label="subenai — domov"
        >
          <img src="/favicon.svg" alt="" aria-hidden="true" className="h-9 w-9 sm:hidden" />
          <img src="/logo.svg" alt="subenai" className="hidden sm:block h-9 w-auto md:h-10" />
        </Link>

        {/* Desktop nav (md+) */}
        <div
          data-testid="header-desktop-nav"
          className="hidden items-center gap-1 md:flex md:gap-2"
        >
          {NAV_ITEMS.map((item) => (
            <DesktopNavLink
              key={item.to}
              to={item.to}
              slug={item.slug}
              label={item.label}
              active={activeTo === item.to}
            />
          ))}
          {isAuthenticated && (
            <Link
              to="/app"
              data-testid="site-header-nav-link-app"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Moje testy
            </Link>
          )}
          <LocaleSwitcher />
          <CtaPill />
        </div>

        {/* Mobile hamburger (< md) */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            data-testid="header-mobile-trigger"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/40 text-foreground transition-colors hover:bg-card md:hidden"
            aria-label="Otvoriť menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </SheetTrigger>
          <SheetContent
            data-testid="header-mobile-sheet"
            side="right"
            className="flex w-screen max-w-full flex-col gap-0 border-l border-border/60 bg-background p-0 sm:max-w-md [&>button]:hidden"
          >
            <SheetTitle className="sr-only">Hlavná navigácia</SheetTitle>
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
              <Link
                to={ROUTES.home}
                data-testid="header-mobile-logo-link"
                aria-label="subenai — domov"
                className="inline-flex items-center"
              >
                <img src="/logo.svg" alt="subenai" className="h-8 w-auto" />
              </Link>
              <SheetClose
                data-testid="header-mobile-close"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/40 text-foreground hover:bg-card"
                aria-label="Zavrieť menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </SheetClose>
            </div>

            <ul className="flex flex-1 flex-col gap-1 px-5 py-6">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    data-testid={`header-mobile-nav-link-${item.slug}`}
                    className={`block rounded-xl px-4 py-4 text-base font-semibold transition-colors ${
                      activeTo === item.to
                        ? "bg-primary/10 text-foreground"
                        : "text-muted-foreground hover:bg-card hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              {isAuthenticated && (
                <li>
                  <Link
                    to="/app"
                    data-testid="site-header-mobile-nav-link-app"
                    className="block rounded-xl px-4 py-4 text-base font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                  >
                    Moje testy
                  </Link>
                </li>
              )}
            </ul>

            <div className="flex flex-col gap-3 border-t border-border/40 px-5 py-5">
              <div className="flex justify-center" data-testid="header-mobile-locale">
                <LocaleSwitcher variant="outline" />
              </div>
              <Link
                to={CTA_ITEM.to}
                data-testid="header-mobile-cta"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-gradient px-6 py-4 text-base font-bold text-primary-foreground shadow-glow"
                aria-label={CTA_ITEM.labelLong}
              >
                {CTA_ITEM.labelShort}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}

function DesktopNavLink({
  to,
  slug,
  label,
  active,
}: {
  to: string;
  slug: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      data-testid={`header-nav-link-${slug}`}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:text-foreground ${
        active ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      {label}
    </Link>
  );
}

function CtaPill() {
  return (
    <Link
      to={CTA_ITEM.to}
      data-testid="header-cta-pill"
      aria-label={CTA_ITEM.labelLong}
      className="ml-1 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-2xl bg-accent-gradient px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] active:scale-[0.99]"
    >
      Spustiť{" "}
      <span data-testid="header-cta-pill-long-suffix" className="hidden lg:inline">
        rýchly{" "}
      </span>
      test
      <span aria-hidden="true">→</span>
    </Link>
  );
}
