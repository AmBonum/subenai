import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRoute, useMatches } from "@tanstack/react-router";

import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { ConsentPreferencesDialog } from "@/components/consent/ConsentPreferencesDialog";
import { GoogleAnalyticsManager } from "@/components/analytics/GoogleAnalyticsManager";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { LocaleProvider } from "@/i18n/locale-context";
import { tFor } from "@/i18n/quiz";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function NotFoundComponent() {
  const tErr = tFor("errors");
  const tCommon = tFor("common");
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">{tErr("code_404")}</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">{tErr("not_found_title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{tErr("not_found_body")}</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {tCommon("back_home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

function RootComponent() {
  const matches = useMatches();
  const hideSiteHeader = matches.some(
    (m) => (m.staticData as { hideSiteHeader?: boolean } | undefined)?.hideSiteHeader === true,
  );
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <GoogleAnalyticsManager />
        {!hideSiteHeader && <SiteHeader />}
        <Outlet />
        <ConsentBanner />
        <ConsentPreferencesDialog />
      </LocaleProvider>
    </QueryClientProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});
