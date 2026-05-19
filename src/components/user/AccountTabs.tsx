import { Link, useLocation } from "@tanstack/react-router";
import { tFor } from "@/i18n/app-shell";

type TabKey = "profile" | "security" | "dsr";

const TABS: { key: TabKey; to: string; testid: string }[] = [
  { key: "profile", to: "/app/account/profile", testid: "app-account-tab-profile" },
  { key: "security", to: "/app/account/security", testid: "app-account-tab-security" },
  { key: "dsr", to: "/app/legal/dsr", testid: "app-account-tab-dsr" },
];

export function AccountTabs() {
  const t = tFor("account.tabs");
  const loc = useLocation();
  const activeKey: TabKey = loc.pathname.startsWith("/app/legal/dsr")
    ? "dsr"
    : loc.pathname.startsWith("/app/account/security")
      ? "security"
      : "profile";

  return (
    <nav
      className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-card p-1"
      data-testid="app-account-tabs"
      aria-label={t("profile")}
    >
      {TABS.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Link
            key={tab.key}
            to={tab.to}
            data-testid={tab.testid}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
