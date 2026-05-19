// Thin safe wrapper around window.gtag. Use this from feature code
// instead of touching window.gtag directly so:
//   • SSR doesn't blow up (window may not exist)
//   • Tests don't need to stub gtag in every spec
//   • Future tracker swap (Plausible / PostHog / Umami) only changes one file
//
// Consent enforcement is upstream: GoogleAnalyticsManager pushes
// consent state into gtag via 'consent', 'update' on hydration. GA4
// itself then gates each event based on `analytics_storage`. So this
// wrapper does NOT re-check consent — fire-and-forget is correct.

type GtagArgs = Parameters<NonNullable<Window["gtag"]>>;

function safeGtag(...args: GtagArgs): void {
  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;
  try {
    window.gtag(...args);
  } catch {
    // Never let a tracking failure surface to the user. Silent failure
    // here is intentional: a broken ad-blocker injection, network
    // error, or quota throttle must not break the page render.
  }
}

// GA4 custom event with arbitrary params. Use the domain-specific
// helpers in `blog-events.ts` (etc.) — call this only if you need a
// truly ad-hoc event that doesn't fit a domain.
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  safeGtag("event", name, params ?? {});
}

// GA4 page_view. The gtag.js auto-collects pageviews on initial load,
// but TanStack Router transitions don't trigger a full page load, so
// we have to fire page_view manually after navigation.
export function trackPageView(input: { path: string; title?: string; location?: string }): void {
  safeGtag("event", "page_view", {
    page_path: input.path,
    page_title: input.title,
    page_location:
      input.location ?? (typeof window !== "undefined" ? window.location.href : undefined),
  });
}
