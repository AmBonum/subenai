import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { MegaMenu } from "@/components/layout/mega-menu";
import type { MegaMenuItemDef } from "@/components/layout/mega-menu";
import { ROUTES } from "@/config/routes";
import { useAuth } from "@/hooks/useAuth";
import { tFor } from "@/i18n/marketing";

// Phase 1 menu structure — 4 top-level items + right-side CTA pill that
// links to /test (the quick-test entry). The CTA pill is the SINGULAR
// surface for "Spustiť rýchly test" — removing the duplicate "Rýchly test"
// mega-menu item that pointed to the same /test route (UX feedback,
// 2026-05-19).
// Static for v1; future upgrade may drive from `cms_navigation`.
const MEGA_ITEMS: readonly MegaMenuItemDef[] = [
  {
    slug: "testy",
    labelKey: "label",
    descKey: "desc",
    panel: {
      sections: [
        {
          headingKey: "panel_section_verejnost",
          links: [
            { key: "all", labelKey: "panel_link_all", href: ROUTES.testy },
            { key: "eshop", labelKey: "panel_link_eshop", href: "/tests/eshop" },
            { key: "gastro", labelKey: "panel_link_gastro", href: "/tests/gastro" },
            { key: "it", labelKey: "panel_link_it", href: "/tests/it" },
          ],
        },
        {
          headingKey: "panel_section_lektorov",
          links: [{ key: "composer", labelKey: "panel_link_composer", href: ROUTES.builder }],
        },
      ],
      featured: {
        labelKey: "panel_featured",
        href: ROUTES.testy,
        icon: "ClipboardCheck",
        tone: "tests",
      },
    },
  },
  {
    slug: "skolenia",
    labelKey: "label",
    descKey: "desc",
    panel: {
      sections: [
        {
          headingKey: "panel_section_kurzy",
          links: [
            { key: "all", labelKey: "panel_link_all", href: ROUTES.skolenia },
            {
              key: "email_phishing",
              labelKey: "panel_link_email_phishing",
              href: "/courses/email-phishing",
            },
            {
              key: "sms_smishing",
              labelKey: "panel_link_sms_smishing",
              href: "/courses/sms-smishing",
            },
            { key: "vishing", labelKey: "panel_link_vishing", href: "/courses/vishing" },
          ],
        },
      ],
      featured: {
        labelKey: "panel_featured",
        href: ROUTES.skoly,
        icon: "GraduationCap",
        tone: "schools",
      },
    },
  },
  {
    slug: "pre_skoly",
    labelKey: "label",
    descKey: "desc",
    href: ROUTES.skoly,
  },
  {
    slug: "blog",
    labelKey: "label",
    descKey: "desc",
    href: ROUTES.blog,
  },
  {
    slug: "podpora",
    labelKey: "label",
    descKey: "desc",
    href: ROUTES.podpora,
  },
] as const;

const CTA_TO = ROUTES.test;

// Map item slug → all route prefixes that should highlight it. A nested
// route under one of the panel sub-links keeps the parent item highlighted.
function getItemPrefixes(item: MegaMenuItemDef): string[] {
  const prefixes: string[] = [];
  if (item.href) prefixes.push(item.href);
  if (item.panel) {
    for (const section of item.panel.sections) {
      for (const link of section.links) prefixes.push(link.href);
    }
  }
  return prefixes;
}

function computeActiveSlug(pathname: string): string | null {
  let bestSlug: string | null = null;
  let bestPrefixLength = 0;
  for (const item of MEGA_ITEMS) {
    for (const prefix of getItemPrefixes(item)) {
      const matches = pathname === prefix || pathname.startsWith(prefix + "/");
      if (matches && prefix.length > bestPrefixLength) {
        bestSlug = item.slug;
        bestPrefixLength = prefix.length;
      }
    }
  }
  return bestSlug;
}

export function SiteHeader() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const t = tFor("header");

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const activeSlug = computeActiveSlug(pathname);
  const ctaLong = t("cta.long");

  return (
    <header
      data-testid="header-root"
      className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <nav
        data-testid="header-nav"
        aria-label={t("main_nav_aria")}
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:py-4"
      >
        <Link
          to={ROUTES.home}
          data-testid="header-logo-link"
          className="flex items-center"
          aria-label={t("logo_aria")}
        >
          {/* Below lg: show only the favicon S-mark — the mega-menu eats
              the horizontal budget at md and the full wordmark would wrap.
              From lg+ the layout has room for the wordmark. */}
          <img src="/favicon.svg" alt="" aria-hidden="true" className="h-9 w-9 lg:hidden" />
          <img src="/logo.svg" alt="subenai" className="hidden lg:block h-10 w-auto" />
        </Link>

        {/* Desktop mega-menu — shown at ≥820px. The default `md:` (768px)
            breakpoint caused horizontal overflow on tablets in portrait
            (nav + CTA ≈ 848px > 768px viewport, 2026-05-19 finding from
            Phase 5 e2e support TC-16). 820px is where the contents
            actually fit without wrap. */}
        <div
          data-testid="header-desktop-nav"
          className="hidden items-center gap-1 min-[820px]:flex min-[820px]:gap-2"
        >
          <MegaMenu items={MEGA_ITEMS} activeSlug={activeSlug} />
          {isAuthenticated && (
            <Link
              to="/app"
              data-testid="site-header-nav-link-app"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("nav.app")}
            </Link>
          )}
          {/* Slot is empty while LOCALE_SWITCHER_ENABLED = false */}
          <div data-testid="header-desktop-locale">
            <LocaleSwitcher />
          </div>
          <CtaPill ariaLabel={ctaLong} />
        </div>

        {/* Mobile hamburger — shown below 820px (paired with the desktop
            nav's `min-[820px]:flex`; see comment above). */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            data-testid="header-mobile-trigger"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/40 text-foreground transition-colors hover:bg-card min-[820px]:hidden"
            aria-label={t("open_menu_aria")}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </SheetTrigger>
          <SheetContent
            data-testid="header-mobile-sheet"
            side="right"
            className="flex w-screen max-w-full flex-col gap-0 border-l border-border/60 bg-background p-0 sm:max-w-md [&>button]:hidden"
          >
            <SheetTitle className="sr-only">{t("mobile_nav_title")}</SheetTitle>
            <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
              <Link
                to={ROUTES.home}
                data-testid="header-mobile-logo-link"
                aria-label={t("logo_aria")}
                className="inline-flex items-center"
              >
                <img src="/logo.svg" alt="subenai" className="h-8 w-auto" />
              </Link>
              <SheetClose
                data-testid="header-mobile-close"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/40 text-foreground hover:bg-card"
                aria-label={t("close_menu_aria")}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </SheetClose>
            </div>

            <MobileMenu items={MEGA_ITEMS} activeSlug={activeSlug} />

            <div className="flex flex-col gap-3 border-t border-border/40 px-5 py-5">
              {isAuthenticated && (
                <Link
                  to="/app"
                  data-testid="site-header-mobile-nav-link-app"
                  className="block rounded-xl px-4 py-3 text-base font-semibold text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                >
                  {t("nav.app")}
                </Link>
              )}
              <div className="flex justify-center" data-testid="header-mobile-locale">
                <LocaleSwitcher variant="outline" />
              </div>
              <Link
                to={CTA_TO}
                data-testid="header-mobile-cta"
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-gradient px-6 py-4 text-base font-bold text-primary-foreground shadow-glow"
                aria-label={ctaLong}
              >
                {t("cta.short")}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}

function MobileMenu({
  items,
  activeSlug,
}: {
  items: readonly MegaMenuItemDef[];
  activeSlug: string | null;
}) {
  const t = tFor("header");

  return (
    <div className="flex flex-1 flex-col overflow-y-auto px-5 py-4">
      <Accordion type="multiple" className="flex flex-col gap-1">
        {items.map((item) => {
          const isActive = activeSlug === item.slug;
          const label = t(`menu.${item.slug}.label`);

          if (!item.panel) {
            return (
              <Link
                key={item.slug}
                to={item.href!}
                data-testid={`header-mobile-nav-link-${item.slug}`}
                className={`block rounded-xl px-4 py-4 text-base font-semibold transition-colors ${
                  isActive
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                {label}
              </Link>
            );
          }

          return (
            <AccordionItem
              key={item.slug}
              value={item.slug}
              data-testid={`header-mobile-nav-accordion-${item.slug}`}
              className="border-0"
            >
              <AccordionTrigger
                data-testid={`header-mobile-nav-trigger-${item.slug}`}
                className={`rounded-xl px-4 py-4 text-base font-semibold hover:no-underline ${
                  isActive
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-card hover:text-foreground"
                }`}
              >
                {label}
              </AccordionTrigger>
              <AccordionContent
                data-testid={`header-mobile-nav-panel-${item.slug}`}
                className="pb-2 pl-4"
              >
                <ul className="flex flex-col gap-1">
                  {item.panel.sections.flatMap((section) =>
                    section.links.map((link) => (
                      <li key={link.key}>
                        <Link
                          to={link.href}
                          data-testid={`header-mobile-nav-panel-link-${item.slug}-${link.key}`}
                          className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
                        >
                          {t(`menu.${item.slug}.${link.labelKey}`)}
                        </Link>
                      </li>
                    )),
                  )}
                  {item.panel.featured && (
                    <li>
                      <Link
                        to={item.panel.featured.href}
                        data-testid={`header-mobile-nav-panel-featured-${item.slug}`}
                        className="block rounded-md px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-card"
                      >
                        {t(`menu.${item.slug}.${item.panel.featured.labelKey}`)}
                      </Link>
                    </li>
                  )}
                </ul>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

function CtaPill({ ariaLabel }: { ariaLabel: string }) {
  const t = tFor("header");
  return (
    <Link
      to={CTA_TO}
      data-testid="header-cta-pill"
      aria-label={ariaLabel}
      className="ml-1 inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-2xl bg-accent-gradient px-4 py-2 text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.03] active:scale-[0.99]"
    >
      {t("cta.split_prefix")}
      <span data-testid="header-cta-pill-long-suffix" className="hidden lg:inline">
        {t("cta.split_middle")}
      </span>
      {t("cta.split_suffix")}
      <span aria-hidden="true">→</span>
    </Link>
  );
}
