import { Link, useLocation } from "@tanstack/react-router";
import { BookOpen, Home, Menu, ClipboardList, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { ROUTES } from "@/config/routes";
import { cn } from "@/lib/utils";
import { tFor } from "@/i18n/marketing";

// Mobile-only sticky bottom navigation — the app-style tab bar the owner
// asked for ("header dole, sticky na spodku, ako mobilné appky"). Hidden from
// lg up, where the top header carries the nav. Primary destinations sit left
// and right of a raised, accent quick-test CTA; the "Menu" tab opens the same
// full sidebar sheet the desktop hamburger uses (open state is lifted to the
// root layout and shared — see __root.tsx). Public chrome only; the /app and
// /admin shells render their own navigation.

interface BottomNavLink {
  key: string;
  to: string;
  labelKey: string;
  icon: LucideIcon;
  /** true → active only on the exact path (Home); false → also on subpaths. */
  exact?: boolean;
}

const LINKS: readonly BottomNavLink[] = [
  { key: "home", to: ROUTES.home, labelKey: "bottom_nav.home", icon: Home, exact: true },
  { key: "tests", to: ROUTES.testy, labelKey: "bottom_nav.tests", icon: ClipboardList },
  { key: "academy", to: ROUTES.academy, labelKey: "bottom_nav.academy", icon: BookOpen },
] as const;

function isActive(pathname: string, to: string, exact?: boolean): boolean {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(to + "/");
}

export interface MobileBottomNavProps {
  onOpenMenu: () => void;
  menuOpen: boolean;
}

export function MobileBottomNav({ onOpenMenu, menuOpen }: MobileBottomNavProps) {
  const { pathname } = useLocation();
  const t = tFor("header");
  // /test (quick test) is the raised centre CTA; guard it from matching the
  // /tests prefix (distinct route).
  const quickTestActive =
    (pathname === ROUTES.test || pathname.startsWith(ROUTES.test + "/")) &&
    !pathname.startsWith(ROUTES.testy);

  return (
    <nav
      data-testid="mobile-bottomnav-root"
      aria-label={t("bottom_nav.aria")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/50 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/75 lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 items-end px-1">
        <BottomNavTab
          link={LINKS[0]}
          active={isActive(pathname, LINKS[0].to, LINKS[0].exact)}
          label={t(LINKS[0].labelKey)}
        />
        <BottomNavTab
          link={LINKS[1]}
          active={isActive(pathname, LINKS[1].to, LINKS[1].exact)}
          label={t(LINKS[1].labelKey)}
        />

        {/* Raised centre quick-test CTA. */}
        <li className="flex flex-col items-center">
          <Link
            to={ROUTES.test}
            data-testid="mobile-bottomnav-item-quicktest"
            aria-label={t("cta.long")}
            aria-current={quickTestActive ? "page" : undefined}
            className="-mt-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-gradient text-primary-foreground shadow-glow ring-4 ring-background transition-transform active:scale-95"
          >
            <Zap className="h-6 w-6" aria-hidden="true" />
          </Link>
          <span className="pb-1.5 pt-0.5 text-[10px] font-semibold text-foreground">
            {t("bottom_nav.quicktest")}
          </span>
        </li>

        <BottomNavTab
          link={LINKS[2]}
          active={isActive(pathname, LINKS[2].to, LINKS[2].exact)}
          label={t(LINKS[2].labelKey)}
        />

        {/* Menu — opens the shared sidebar sheet. */}
        <li className="flex">
          <button
            type="button"
            data-testid="mobile-bottomnav-item-menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-label={t("open_menu_aria")}
            onClick={onOpenMenu}
            className={cn(
              "flex w-full flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-medium transition-colors",
              menuOpen ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
            {t("bottom_nav.menu")}
          </button>
        </li>
      </ul>
    </nav>
  );
}

function BottomNavTab({
  link,
  active,
  label,
}: {
  link: BottomNavLink;
  active: boolean;
  label: string;
}) {
  return (
    <li className="flex">
      <Link
        to={link.to}
        data-testid={`mobile-bottomnav-item-${link.key}`}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex w-full flex-col items-center gap-0.5 px-1 pb-1.5 pt-2 text-[10px] font-medium transition-colors",
          active ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <link.icon className="h-5 w-5" aria-hidden="true" />
        {label}
      </Link>
    </li>
  );
}
