import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeadContent, Outlet, createRootRoute, useMatches } from "@tanstack/react-router";

import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { ConsentPreferencesDialog } from "@/components/consent/ConsentPreferencesDialog";
import { GoogleAnalyticsManager } from "@/components/analytics/GoogleAnalyticsManager";
import { SignedOutFlash } from "@/components/auth/SignedOutFlash";
import { Footer } from "@/components/layout/Footer";
import { NotFoundPage } from "@/components/layout/NotFoundPage";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SkipToContentLink } from "@/components/layout/SkipToContentLink";
import { ScamChatWidget } from "@/components/scam-chat/ScamChatWidget";
import { Toaster } from "@/components/ui/sonner";
import { AccessibilityProvider } from "@/components/theme/AccessibilityProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { LocaleProvider } from "@/i18n/locale-context";

// No-flash note: the synchronous theme bootstrap that applies `.dark`
// before first paint lives in the static document shell (`index.html`),
// not here — this app mounts as a client SPA (`src/main.tsx`), so a
// route-level `head()` script would only run after hydration, too late to
// prevent a flash. ThemeProvider below keeps the class in sync at runtime.

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
  // SEO meta layering (decided 2026-06-12, see functions/_lib/seo-meta.ts):
  //   1. crawlable routes for JS-less crawlers — the edge function REWRITES
  //      the static index.html tags in place;
  //   2. everything else JS-less — the static `data-seo-default` tags are
  //      the fallback;
  //   3. browsers — route `head()` is the runtime truth, so once the router
  //      has hydrated we DROP the static layer. Without this every route
  //      carried two og:title/og:description sets and first-meta-wins
  //      crawlers (with JS) saw homepage values on subpages.
  useEffect(() => {
    // meta AND link (the edge function injects a marked canonical too).
    document.querySelectorAll("[data-seo-default]").forEach((el) => el.remove());
  }, []);
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
  // E53.3 — the scam-chat launcher appears ONLY on the home page (product
  // decision 2026-06-13). The index route is the single match with id "/".
  const isHomePage = matches.some((m) => m.routeId === "/");
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AccessibilityProvider>
          <LocaleProvider>
            {/* Renders the <title> + <meta> from every matched route's `head()`
              into the document head. Without this, route-level head config
              (noindex on /app + /admin + /auth/*, page titles on every nav)
              is silently dropped — production gap discovered 2026-05-19
              during Phase 4 auth E2E (TC-17 forgot-password). */}
            <HeadContent />
            <GoogleAnalyticsManager />
            {/* Skip link + `#main` target only for the public chrome —
              routes with `hideSiteHeader` (app/admin shells) render their
              own pair, so an unconditional wrapper here would duplicate
              the `main` id. */}
            {!hideSiteHeader && <SkipToContentLink />}
            {!hideSiteHeader && <SiteHeader />}
            {hideSiteHeader ? (
              <Outlet />
            ) : (
              <div id="main" tabIndex={-1}>
                <Outlet />
              </div>
            )}
            {!hideSiteFooter && <Footer />}
            <ConsentBanner />
            <ConsentPreferencesDialog />
            {!isInsidePrivateShell && <Toaster position="top-center" />}
            {isHomePage && <ScamChatWidget />}
            <SignedOutFlash />
          </LocaleProvider>
        </AccessibilityProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
});
