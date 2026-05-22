import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signOutAndRedirect } from "@/lib/auth/signout";
import {
  LayoutDashboard,
  MessageSquareText,
  Users,
  FolderTree,
  Flag,
  Settings,
  Sparkles,
  LogOut,
  GraduationCap,
  Library,
  ClipboardList,
  Share2,
  Zap,
  Heart,
  FileText,
  Navigation,
  PanelTop,
  PanelBottom,
  ShieldCheck,
  ScrollText,
  UserCog,
  LayoutTemplate,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LocaleSwitcher } from "@/components/i18n/LocaleSwitcher";
import { tFor } from "@/i18n/admin";
import { LiveSupportBadge } from "@/components/admin/queue/LiveSupportBadge";

type NavItem = {
  key: string;
  url: string;
  icon: LucideIcon;
  testid: string;
  exact?: boolean;
  badge?: string;
};

const mainItems: NavItem[] = [
  {
    key: "dashboard",
    url: "/admin",
    icon: LayoutDashboard,
    exact: true,
    testid: "admin-shell-sidebar-link-dashboard",
  },
  {
    key: "tests",
    url: "/admin/tests",
    icon: ClipboardList,
    testid: "admin-shell-sidebar-link-tests",
  },
  {
    key: "quick_test",
    url: "/admin/quick-test",
    icon: Zap,
    testid: "admin-shell-sidebar-link-quick-test",
  },
  {
    key: "share_card",
    url: "/admin/share-card",
    icon: Share2,
    testid: "admin-shell-sidebar-link-share-card",
  },
  {
    key: "questions",
    url: "/admin/questions",
    icon: MessageSquareText,
    testid: "admin-shell-sidebar-link-questions",
  },
  {
    key: "answer_sets",
    url: "/admin/answer-sets",
    icon: Library,
    testid: "admin-shell-sidebar-link-answer-sets",
  },
  {
    key: "trainings",
    url: "/admin/trainings",
    icon: GraduationCap,
    testid: "admin-shell-sidebar-link-trainings",
  },
  { key: "users", url: "/admin/users", icon: Users, testid: "admin-shell-sidebar-link-users" },
  {
    key: "categories",
    url: "/admin/categories",
    icon: FolderTree,
    testid: "admin-shell-sidebar-link-categories",
  },
  {
    key: "reports",
    url: "/admin/reports",
    icon: Flag,
    badge: "3",
    testid: "admin-shell-sidebar-link-reports",
  },
  {
    key: "support",
    // E48.6 — /admin/support kept as a back-compat redirect to /admin/tickets
    // (the empty AH-10.4 stub is now the ticketing console).
    url: "/admin/tickets",
    icon: Heart,
    testid: "admin-shell-sidebar-link-support",
  },
];

const cmsItems: NavItem[] = [
  { key: "blog", url: "/admin/blog", icon: FileText, testid: "admin-shell-sidebar-link-blog" },
  { key: "pages", url: "/admin/pages", icon: FileText, testid: "admin-shell-sidebar-link-pages" },
  {
    key: "navigation",
    url: "/admin/navigation",
    icon: Navigation,
    testid: "admin-shell-sidebar-link-navigation",
  },
  {
    key: "header",
    url: "/admin/header",
    icon: PanelTop,
    testid: "admin-shell-sidebar-link-header",
  },
  {
    key: "footer",
    url: "/admin/footer",
    icon: PanelBottom,
    testid: "admin-shell-sidebar-link-footer",
  },
];

// E40 close-out — surface the governance/compliance pages that already
// exist (`/admin/dsr` from E37, `/admin/dpa-requests` from E40). Both
// routes shipped with data hooks + queues but had no sidebar entry, so
// admins could only reach them by typing the URL. Grouping with
// settings + security keeps "Systém" as the catch-all for ops surfaces
// instead of fragmenting into another group.
const systemItems: NavItem[] = [
  {
    key: "dsr",
    url: "/admin/dsr",
    icon: UserCog,
    testid: "admin-shell-sidebar-link-dsr",
  },
  {
    key: "dpa_requests",
    url: "/admin/dpa-requests",
    icon: ScrollText,
    testid: "admin-shell-sidebar-link-dpa-requests",
  },
  {
    key: "templates_moderation",
    url: "/admin/templates",
    icon: LayoutTemplate,
    testid: "admin-shell-sidebar-link-templates-moderation",
  },
  {
    key: "settings",
    url: "/admin/settings",
    icon: Settings,
    testid: "admin-shell-sidebar-link-settings",
  },
  {
    key: "security",
    url: "/admin/security",
    icon: ShieldCheck,
    testid: "admin-shell-sidebar-link-security",
  },
];

export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const t = tFor("shell");

  // Dynamic admin info: read the current Supabase user. AH-12 enforces AAL2
  // for /admin so this hook only renders inside an authenticated admin
  // session. Falls back to a neutral label if the session has not yet
  // resolved (first render before useEffect fires).
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const user = data.user;
      if (!user) return;
      setAdminEmail(user.email ?? null);
      const meta = (user.user_metadata ?? {}) as { display_name?: string };
      setAdminName(meta.display_name ?? user.email?.split("@")[0] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const initials = (adminName ?? adminEmail ?? "AD").slice(0, 2).toUpperCase();

  const isActive = (url: string, exact?: boolean) =>
    exact ? pathname === url : pathname === url || pathname.startsWith(url + "/");

  const renderItem = (item: NavItem) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton
        asChild
        isActive={isActive(item.url, item.exact)}
        tooltip={t(`nav.${item.key}`)}
      >
        <Link to={item.url} className="flex items-center gap-3" data-testid={item.testid}>
          <item.icon className="h-4 w-4" />
          <span className="flex-1">{t(`nav.${item.key}`)}</span>
          {item.key === "support" ? (
            <LiveSupportBadge />
          ) : item.badge ? (
            <Badge
              variant="secondary"
              className="h-5 px-1.5 text-[10px] group-data-[collapsible=icon]:hidden"
            >
              {item.badge}
            </Badge>
          ) : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon" data-testid="admin-shell-sidebar">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)] shadow-[var(--shadow-elegant)]">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-sidebar-foreground">{t("brand")}</span>
            <span className="text-xs text-sidebar-foreground/60">{t("console")}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("group_main")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{mainItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("group_cms")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{cmsItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("group_system")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{systemItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div
          className="flex justify-center px-2 py-2 group-data-[collapsible=icon]:hidden"
          data-testid="admin-shell-sidebar-locale"
        >
          <LocaleSwitcher variant="outline" />
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              tooltip={t("logout_label")}
              onClick={() => {
                void signOutAndRedirect("/");
              }}
              data-testid="admin-shell-sidebar-logout"
              aria-label={t("logout_label")}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col text-left text-xs group-data-[collapsible=icon]:hidden">
                <span
                  className="font-medium text-sidebar-foreground"
                  data-testid="admin-shell-sidebar-account-name"
                >
                  {adminName ?? t("account_label")}
                </span>
                <span
                  className="text-sidebar-foreground/60"
                  data-testid="admin-shell-sidebar-account-email"
                >
                  {adminEmail ?? ""}
                </span>
              </div>
              <LogOut className="h-4 w-4 text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
