import { Link, useLocation } from "@tanstack/react-router";
import { ReactNode } from "react";
import { signOutAndRedirect } from "@/lib/auth/signout";
import {
  LayoutDashboard,
  FilePlus2,
  Library,
  Users,
  Bell,
  History,
  BookOpen,
  Shield,
  FileText,
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
  | "tests_new"
  | "templates"
  | "library"
  | "audiences"
  | "teams"
  | "notifications"
  | "history"
  | "help"
  | "docs"
  | "profile"
  | "security"
  | "dsr";

type NavItem = {
  key: NavKey;
  to: string;
  testid: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badge?: boolean;
};

const NAV: NavItem[] = [
  {
    key: "dashboard",
    to: "/app",
    testid: "app-shell-sidebar-link-dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    key: "tests",
    to: "/app/tests",
    testid: "app-shell-sidebar-link-tests",
    icon: ClipboardList,
  },
  {
    key: "tests_new",
    to: "/app/tests/new",
    testid: "app-shell-sidebar-link-tests-new",
    icon: FilePlus2,
  },
  {
    key: "templates",
    to: "/app/templates",
    testid: "app-shell-sidebar-link-templates",
    icon: Layers,
  },
  {
    key: "library",
    to: "/app/library",
    testid: "app-shell-sidebar-link-library",
    icon: Library,
  },
  {
    key: "audiences",
    to: "/app/audiences",
    testid: "app-shell-sidebar-link-audiences",
    icon: UsersRound,
  },
  {
    key: "teams",
    to: "/app/teams",
    testid: "app-shell-sidebar-link-teams",
    icon: Users,
  },
  {
    key: "notifications",
    to: "/app/notifications",
    testid: "app-shell-sidebar-link-notifications",
    icon: Bell,
    badge: true,
  },
  {
    key: "history",
    to: "/app/history",
    testid: "app-shell-sidebar-link-history",
    icon: History,
  },
  {
    key: "help",
    to: "/app/help",
    testid: "app-shell-sidebar-link-help",
    icon: BookOpen,
  },
  {
    key: "docs",
    to: "/docs",
    testid: "app-shell-sidebar-link-docs",
    icon: FileText,
  },
  {
    key: "profile",
    to: "/app/account/profile",
    testid: "app-shell-sidebar-link-account-profile",
    icon: UserCog,
  },
  {
    key: "security",
    to: "/app/account/security",
    testid: "app-shell-sidebar-link-account-security",
    icon: Shield,
  },
  {
    key: "dsr",
    to: "/app/legal/dsr",
    testid: "app-shell-sidebar-link-dsr",
    icon: FileText,
  },
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
            {t("brand")}
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <LocaleSwitcher />
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
          <nav className="sticky top-6 space-y-1" data-testid="app-shell-sidebar-nav">
            {NAV.map((n) => {
              const active = n.exact ? loc.pathname === n.to : loc.pathname.startsWith(n.to);
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  data-testid={n.testid}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" /> {t(`nav.${n.key}`)}
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
            })}
            {isAdmin && (
              <div className="pt-4 text-xs text-muted-foreground">
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
