import { Link } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, UserCog } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentProfile } from "@/lib/platform/queries";
import { signOutAndRedirect } from "@/lib/auth/signout";
import { tFor } from "@/i18n/marketing";

export function HeaderUserMenu() {
  const profileQ = useCurrentProfile();
  const me = profileQ.data;
  const t = tFor("header");
  const initials = me?.avatar_initials ?? me?.display_name?.slice(0, 2).toUpperCase() ?? "";
  const name = me?.display_name ?? me?.email ?? "";
  // Skeleton trigger while the profile is in flight to avoid a flash
  // of empty initials. Once data lands (or fails), the real trigger
  // takes over.
  if (profileQ.isLoading && !me) {
    return (
      <div
        data-testid="header-user-menu-loading"
        aria-label={t("user_menu.loading_aria")}
        role="status"
        className="inline-flex h-9 w-9 animate-pulse rounded-full border border-border/60 bg-card/40"
      />
    );
  }
  const triggerAria = name
    ? t("user_menu.trigger_aria_with_name", { name })
    : t("user_menu.trigger_aria");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid="header-user-menu-trigger"
        aria-label={triggerAria}
        className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 py-1 pl-1 pr-3 text-sm font-medium text-foreground transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground"
          data-testid="header-user-menu-avatar"
          aria-hidden="true"
        >
          {initials}
        </span>
        <span
          className="hidden max-w-[10rem] truncate lg:inline"
          data-testid="header-user-menu-name"
        >
          {name}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid="header-user-menu-content" className="w-64">
        {name && (
          <>
            <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {t("user_menu.signed_in_as")}
              </span>
              <span
                className="truncate text-sm font-semibold text-foreground"
                data-testid="header-user-menu-label-name"
              >
                {name}
              </span>
              {me?.email && me.email !== name && (
                <span
                  className="truncate text-xs text-muted-foreground"
                  data-testid="header-user-menu-label-email"
                >
                  {me.email}
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link to="/app" data-testid="header-user-menu-app" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            {t("user_menu.app")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            to="/app/account/profile"
            data-testid="header-user-menu-profile"
            className="flex items-center gap-2"
          >
            <UserCog className="h-4 w-4" />
            {t("user_menu.profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          data-testid="header-user-menu-signout"
          onSelect={(e) => {
            e.preventDefault();
            void signOutAndRedirect("/");
          }}
          className="flex items-center gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          {t("user_menu.signout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
