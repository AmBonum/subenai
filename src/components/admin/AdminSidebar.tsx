import { Link, useRouterState } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
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
  BookOpen,
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
import { tFor } from "@/i18n/admin";

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
    url: "/admin/support",
    icon: Heart,
    testid: "admin-shell-sidebar-link-support",
  },
];

const cmsItems: NavItem[] = [
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

const systemItems: NavItem[] = [
  { key: "docs", url: "/docs", icon: BookOpen, testid: "admin-shell-sidebar-link-docs" },
  {
    key: "settings",
    url: "/admin/settings",
    icon: Settings,
    testid: "admin-shell-sidebar-link-settings",
  },
];

export function AdminSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const t = tFor("shell");

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
          {item.badge && (
            <Badge
              variant="secondary"
              className="h-5 px-1.5 text-[10px] group-data-[collapsible=icon]:hidden"
            >
              {item.badge}
            </Badge>
          )}
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
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={t("account_label")}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                  JH
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col text-left text-xs group-data-[collapsible=icon]:hidden">
                <span className="font-medium text-sidebar-foreground">Jana Horváthová</span>
                <span className="text-sidebar-foreground/60">admin@subenai.sk</span>
              </div>
              <LogOut className="h-4 w-4 text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
