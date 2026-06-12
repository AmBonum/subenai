import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { Bell, Search } from "lucide-react";

import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SkipToContentLink } from "@/components/layout/SkipToContentLink";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";
import { requireRole } from "@/integrations/supabase/role-middleware";
import { tFor } from "@/i18n/admin";
import { useUnreadAdminNotificationsCount } from "@/lib/admin/queries";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    await requireRole("admin", location.pathname);
  },
  head: () => ({
    meta: [
      { title: "Admin · SubenAI" },
      { name: "description", content: "Administračné rozhranie pre SubenAI." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  staticData: { hideSiteHeader: true, hideSiteFooter: true },
  component: AdminLayout,
});

function AdminLayout() {
  const t = tFor("shell");
  const unreadCount = useUnreadAdminNotificationsCount().data ?? 0;
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background" data-testid="admin-shell-root">
        <SkipToContentLink />
        <AdminSidebar />
        <SidebarInset className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger
              data-testid="admin-shell-sidebar-collapse-toggle"
              aria-label={t("collapse_toggle_aria")}
            />
            <Separator orientation="vertical" className="h-6" />
            <div className="relative hidden flex-1 max-w-md md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("search_placeholder")}
                className="h-9 border-border/60 bg-muted/40 pl-9 focus-visible:bg-background"
                data-testid="admin-shell-search-input"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="relative"
                data-testid="admin-shell-notifications"
                aria-label={
                  unreadCount > 0
                    ? `${unreadCount} neprečítaných upozornení`
                    : "Žiadne neprečítané upozornenia"
                }
              >
                <Link to="/admin/templates">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 ? (
                    <span
                      data-testid="admin-shell-notifications-badge"
                      className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" data-testid="admin-shell-back-to-site">
                <Link to="/">{t("back_to_site")}</Link>
              </Button>
            </div>
          </header>

          {/* `min-w-0` mirrors the AppShell pattern at
              `src/components/user/AppShell.tsx:311`. Without it, this
              flex item defaults to `min-width: auto` (= content
              min-width), so any admin page with a wide `<Table>`,
              long unbreakable header, or `<pre>` could force the
              entire shell to overflow the viewport on narrow widths
              — same root cause as the /cookies bug fixed in PR #69.
              shadcn `<Table>` already wraps in `overflow-auto` and
              would handle its own scroll, but only if its ancestor
              flex chain is allowed to shrink. */}
          <main
            id="main"
            tabIndex={-1}
            className="min-w-0 flex-1 p-4 md:p-6 lg:p-8"
            data-testid="admin-shell-main"
          >
            <Outlet />
          </main>
        </SidebarInset>
        <Toaster position="bottom-right" />
      </div>
    </SidebarProvider>
  );
}
