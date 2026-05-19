import { Link, useLocation } from "@tanstack/react-router";
import { ReactNode } from "react";
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
  UsersRound,
  UserCog,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCurrentProfile, useNotifications } from "@/lib/platform/queries";
import { useAuth } from "@/hooks/useAuth";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { tFor } from "@/i18n/app-shell";

type NavKey =
  | "dashboard"
  | "tests"
  | "templates"
  | "library"
  | "audiences"
  | "history"
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

  const renderItem = (n: NavItem) => {
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
        key={n.to}
        to={n.to}
        data-testid={n.testid}
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
            data-testid="app-shell-sidebar-notifications-badge"
          >
            {unread}
          </Badge>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[image:var(--gradient-subtle)]" data-testid="app-shell-root">
      <header
        className="border-b border-border/40 bg-card/60 backdrop-blur"
        data-testid="app-shell-header"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-semibold"
            data-testid="app-shell-header-home"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <span>{t("brand")}</span>
            <span
              className="text-muted-foreground font-normal"
              data-testid="app-shell-header-brand-subtitle"
            >
              · {t("brand_subtitle")}
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            {/* Slot is empty while LOCALE_SWITCHER_ENABLED = false */}
            <div data-testid="app-shell-header-locale">
              <LocaleSwitcher />
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
          <nav
            className="sticky top-6 flex flex-col gap-1"
            data-testid="app-shell-sidebar-nav"
            aria-label={t("brand")}
          >
            <div className="space-y-1" data-testid="app-shell-sidebar-group-tvorba">
              <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {t("groups.tvorba")}
              </div>
              {TVORBA.map(renderItem)}
            </div>

            <div className="mt-2 space-y-1" data-testid="app-shell-sidebar-group-vysledky">
              <div className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {t("groups.vysledky")}
              </div>
              {VYSLEDKY.map(renderItem)}
            </div>

            <div
              className="mt-4 space-y-1 border-t border-border/40 pt-3"
              data-testid="app-shell-sidebar-group-footer"
            >
              <span className="sr-only">{t("nav.profile.label")}</span>
              {FOOTER.map(renderItem)}
              <button
                type="button"
                onClick={() => {
                  void signOutAndRedirect("/");
                }}
                data-testid="app-shell-sidebar-logout"
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
                  data-testid="app-shell-sidebar-link-admin"
                >
                  <ListChecks className="h-4 w-4" /> {t("admin")}
                </Link>
              </div>
            )}
          </nav>
        </aside>
        <main className="min-w-0 flex-1" data-testid="app-shell-main">
          {children}
        </main>
      </div>
    </div>
  );
}
