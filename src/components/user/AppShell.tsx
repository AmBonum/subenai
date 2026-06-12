import { Link, useLocation } from "@tanstack/react-router";
import { ReactNode, useEffect, useState } from "react";
import { signOutAndRedirect } from "@/lib/auth/signout";
import {
  LayoutDashboard,
  Library,
  Users,
  Bell,
  History,
  BookOpen,
  LogOut,
  Sparkles,
  ListChecks,
  Layers,
  ClipboardList,
  GraduationCap,
  UsersRound,
  UserCog,
  Menu,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCurrentProfile, useNotifications } from "@/lib/platform/queries";
import { useAuth } from "@/hooks/useAuth";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { AccessibilityMenu } from "@/components/theme/AccessibilityMenu";
import { SkipToContentLink } from "@/components/layout/SkipToContentLink";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/sonner";
import { tFor } from "@/i18n/app-shell";

type NavMode = "desktop" | "mobile";

const TESTID_PREFIX: Record<NavMode, string> = {
  desktop: "app-shell-sidebar",
  mobile: "app-shell-mobile",
};

type NavKey =
  | "dashboard"
  | "tests"
  | "edu_tests"
  | "templates"
  | "library"
  | "audiences"
  | "history"
  | "insights"
  | "notifications"
  | "teams"
  | "profile"
  | "help";

type NavItem = {
  key: NavKey;
  to: string;
  testid: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badge?: boolean;
};

const TVORBA: NavItem[] = [
  {
    key: "dashboard",
    to: "/app",
    testid: "app-shell-sidebar-link-dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  { key: "tests", to: "/app/tests", testid: "app-shell-sidebar-link-tests", icon: ClipboardList },
  {
    key: "edu_tests",
    to: "/app/edu-tests",
    testid: "app-shell-sidebar-link-edu-tests",
    icon: GraduationCap,
  },
  {
    key: "templates",
    to: "/app/templates",
    testid: "app-shell-sidebar-link-templates",
    icon: Layers,
  },
  { key: "library", to: "/app/library", testid: "app-shell-sidebar-link-library", icon: Library },
];

const VYSLEDKY: NavItem[] = [
  {
    key: "audiences",
    to: "/app/audiences",
    testid: "app-shell-sidebar-link-audiences",
    icon: UsersRound,
  },
  { key: "history", to: "/app/history", testid: "app-shell-sidebar-link-history", icon: History },
  {
    key: "insights",
    to: "/app/insights",
    testid: "app-shell-sidebar-link-insights",
    icon: Sparkles,
  },
  {
    key: "notifications",
    to: "/app/notifications",
    testid: "app-shell-sidebar-link-notifications",
    icon: Bell,
    badge: true,
  },
];

const FOOTER: NavItem[] = [
  { key: "teams", to: "/app/teams", testid: "app-shell-sidebar-link-teams", icon: Users },
  {
    key: "profile",
    to: "/app/account/profile",
    testid: "app-shell-sidebar-link-account-profile",
    icon: UserCog,
  },
  { key: "help", to: "/app/help", testid: "app-shell-sidebar-link-help", icon: BookOpen },
];

export function AppShell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  const profileQ = useCurrentProfile();
  const notifsQ = useNotifications();
  const { isAdmin } = useAuth();
  const me = profileQ.data;
  const notifs = notifsQ.data ?? [];
  const unread = notifs.filter((n) => !n.read_at).length;
  const t = tFor("sidebar");
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change so Link clicks dismiss the
  // sheet without each Link needing its own onClick handler.
  useEffect(() => {
    setMobileOpen(false);
  }, [loc.pathname]);

  const navTestid = (n: NavItem, mode: NavMode) =>
    mode === "desktop"
      ? n.testid
      : n.testid.replace("app-shell-sidebar-link", "app-shell-mobile-link");

  const renderItem = (n: NavItem, mode: NavMode) => {
    // `/app/account/profile` is the canonical "Account" landing — also light
    // up when the user is on the legacy security/dsr routes that now render
    // as tabs under the same surface.
    const active = n.exact
      ? loc.pathname === n.to
      : n.key === "profile"
        ? loc.pathname.startsWith("/app/account") || loc.pathname.startsWith("/app/legal/dsr")
        : loc.pathname.startsWith(n.to);
    const Icon = n.icon;
    return (
      <Link
        key={`${mode}-${n.to}`}
        to={n.to}
        data-testid={navTestid(n, mode)}
        title={t(`nav.${n.key}.tip`)}
        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
          active
            ? "bg-primary/10 font-medium text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <span className="flex items-center gap-2">
          <Icon className="h-4 w-4" /> {t(`nav.${n.key}.label`)}
        </span>
        {n.badge && unread > 0 && (
          <Badge
            className="h-5 px-1.5 text-[10px]"
            data-testid={`${TESTID_PREFIX[mode]}-notifications-badge`}
          >
            {unread}
          </Badge>
        )}
      </Link>
    );
  };

  const renderNav = (mode: NavMode) => {
    const p = TESTID_PREFIX[mode];
    return (
      <nav
        className={mode === "desktop" ? "sticky top-6 flex flex-col gap-1" : "flex flex-col gap-1"}
        data-testid={`${p}-nav`}
        aria-label={t("brand")}
      >
        <div className="space-y-1" data-testid={`${p}-group-tvorba`}>
          <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {t("groups.tvorba")}
          </div>
          {TVORBA.map((n) => renderItem(n, mode))}
        </div>

        <div className="mt-2 space-y-1" data-testid={`${p}-group-vysledky`}>
          <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            {t("groups.vysledky")}
          </div>
          {VYSLEDKY.map((n) => renderItem(n, mode))}
        </div>

        <div
          className="mt-4 space-y-1 border-t border-border/40 pt-3"
          data-testid={`${p}-group-footer`}
        >
          <span className="sr-only">{t("nav.profile.label")}</span>
          {FOOTER.map((n) => renderItem(n, mode))}
          <button
            type="button"
            onClick={() => {
              void signOutAndRedirect("/");
            }}
            data-testid={`${p}-logout`}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> {t("nav.logout.label")}
          </button>
        </div>

        {isAdmin && (
          <div className="mt-4 border-t border-border/40 pt-3 text-xs text-muted-foreground">
            <Link
              to="/admin"
              className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted"
              data-testid={
                mode === "desktop" ? "app-shell-sidebar-link-admin" : "app-shell-mobile-link-admin"
              }
            >
              <ListChecks className="h-4 w-4" /> {t("admin")}
            </Link>
          </div>
        )}
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-subtle)]" data-testid="app-shell-root">
      <SkipToContentLink />
      <header
        className="border-b border-border/40 bg-card/60 backdrop-blur"
        data-testid="app-shell-header"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                data-testid="app-shell-mobile-trigger"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-card/40 text-foreground transition-colors hover:bg-card lg:hidden"
                aria-label={t("open_menu_aria")}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </SheetTrigger>
              <SheetContent
                data-testid="app-shell-mobile-drawer"
                side="left"
                className="flex w-screen max-w-xs flex-col gap-0 border-r border-border/60 bg-background p-0 [&>button]:hidden"
              >
                <SheetTitle className="sr-only">{t("mobile_nav_title")}</SheetTitle>
                <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    {t("brand")}
                  </span>
                  <SheetClose
                    data-testid="app-shell-mobile-close"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-card/40 text-foreground hover:bg-card"
                    aria-label={t("close_menu_aria")}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </SheetClose>
                </div>
                <div className="flex-1 overflow-y-auto px-3 py-3">{renderNav("mobile")}</div>
              </SheetContent>
            </Sheet>
            <Link
              to="/"
              className="flex min-w-0 items-center gap-2 text-sm font-semibold"
              data-testid="app-shell-header-home"
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="truncate">{t("brand")}</span>
              <span
                className="hidden text-muted-foreground font-normal sm:inline"
                data-testid="app-shell-header-brand-subtitle"
              >
                · {t("brand_subtitle")}
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {/* Slot is empty while LOCALE_SWITCHER_ENABLED = false */}
            <div data-testid="app-shell-header-locale">
              <LocaleSwitcher />
            </div>
            <div data-testid="app-shell-header-theme">
              <ThemeToggle />
            </div>
            <div data-testid="app-shell-header-a11y">
              <AccessibilityMenu />
            </div>
            <div
              className="flex items-center gap-2 rounded-full border border-border/60 bg-card py-1 pl-1 pr-3"
              data-testid="app-shell-header-user"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                {me?.avatar_initials ?? ""}
              </span>
              <span className="hidden sm:inline" data-testid="app-shell-header-user-name">
                {me?.display_name ?? ""}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                void signOutAndRedirect("/");
              }}
              className="text-muted-foreground hover:text-foreground"
              aria-label={t("logout_aria")}
              data-testid="app-shell-header-logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-60 shrink-0 lg:block" data-testid="app-shell-sidebar">
          {renderNav("desktop")}
        </aside>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1" data-testid="app-shell-main">
          {children}
        </main>
      </div>
      <Toaster position="bottom-right" />
    </div>
  );
}
