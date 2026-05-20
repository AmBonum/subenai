import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, createRootRoute, useMatches } from "@tanstack/react-router";

import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { ConsentPreferencesDialog } from "@/components/consent/ConsentPreferencesDialog";
import { GoogleAnalyticsManager } from "@/components/analytics/GoogleAnalyticsManager";
import { SignedOutFlash } from "@/components/auth/SignedOutFlash";
import { Footer } from "@/components/layout/Footer";
import { NotFoundPage } from "@/components/layout/NotFoundPage";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Toaster } from "@/components/ui/sonner";
import { LocaleProvider } from "@/i18n/locale-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function RootComponent() {
  const matches = useMatches();
  const hideSiteHeader = matches.some(
    (m) => (m.staticData as { hideSiteHeader?: boolean } | undefined)?.hideSiteHeader === true,
  );
  // E16.6 — Footer was previously imported + rendered per-route in
  // ~19 public marketing pages. New routes (the entire /blog surface,
  // among others) silently shipped without it. Centralising here means
  // every route gets the Footer by default; `hideSiteFooter` opts out
  // for the routes that have their own chrome (admin shell, app shell,
  // pre-auth screens that intentionally minimise nav noise). Same
  // pattern as `hideSiteHeader` above.
  const hideSiteFooter = matches.some(
    (m) => (m.staticData as { hideSiteFooter?: boolean } | undefined)?.hideSiteFooter === true,
  );
  // /app and /admin mount their own positioned Toasters; rendering a
  // second one here would duplicate every toast on those surfaces
  // (sonner uses a single global store). Public routes have no Toaster
  // otherwise — without this one the signed-out flash on `/` is silent.
  const isInsidePrivateShell = matches.some(
    (m) => m.routeId.startsWith("/app") || m.routeId.startsWith("/admin"),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        {/* Renders the <title> + <meta> from every matched route's `head()`
            into the document head. Without this, route-level head config
            (noindex on /app + /admin + /auth/*, page titles on every nav)
            is silently dropped — production gap discovered 2026-05-19
            during Phase 4 auth E2E (TC-17 forgot-password). */}
        <HeadContent />
        <GoogleAnalyticsManager />
        {!hideSiteHeader && <SiteHeader />}
        <Outlet />
        {!hideSiteFooter && <Footer />}
        <ConsentBanner />
        <ConsentPreferencesDialog />
        {!isInsidePrivateShell && <Toaster position="top-center" />}
        <SignedOutFlash />
      </LocaleProvider>
    </QueryClientProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
});
