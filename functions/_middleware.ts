// E41 — security-header injection for every Cloudflare Pages Function.
//
// `public/_headers` applies to static assets served by Pages
// (the React SPA bundle). It does NOT apply to Functions responses
// — those are JSON / 30x / 4xx coming from `functions/api/**`.
// OWASP ZAP's baseline scan on 2026-05-20 (run #26158116160)
// flagged this gap on the live `/api/*` surface:
//   - 10021 X-Content-Type-Options Header Missing
//   - 10035 Strict-Transport-Security Header Not Set
//   - 90004 Cross-Origin-Embedder-Policy Header Missing or Invalid
//
// This middleware wraps every Function response and injects the same
// header set the static surface gets, plus a JSON-specific tightening
// (CSP `default-src 'none'` — JSON responses never execute scripts,
// so the most-restrictive policy is correct and silences ZAP rule
// 10038 too).
//
// Order matters: anything an individual Function sets explicitly
// (e.g. /api/account/export-data sets Content-Disposition) is
// preserved — we only ADD headers, never overwrite.

import { handleSeoMeta, type SeoMetaEnv } from "./_lib/seo-meta";

const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
};

// Structural subset of the CF PagesFunction context — keeps this file
// type-checkable from the main project tsconfig (which has DOM libs,
// not @cloudflare/workers-types). Same pattern as the per-route
// RequestContext interfaces in functions/api/**.
interface MiddlewareContext {
  request: Request;
  env: SeoMetaEnv;
  next: () => Promise<Response>;
}

// E50 — per-route social/crawler meta injection. Runs INSIDE the security
// wrapper: it transforms the SPA-fallback HTML (only for crawlable
// document requests; everything else passes through), then the security
// middleware adds HSTS/CSP/etc. to whatever HTML/JSON comes back. Kept as
// a library module (functions/_lib/seo-meta.ts) so the routing/fetch/404
// logic is unit-testable without an HTMLRewriter runtime. See that file
// for the [[path]].ts-vs-middleware rationale and the CSP note (no change
// needed — public/_headers already permits the og:image hosts).
const seoMeta = async ({ request, env, next }: MiddlewareContext): Promise<Response> => {
  const upstream = await next();
  return handleSeoMeta(request, env, upstream);
};

const securityHeaders = async ({ next }: MiddlewareContext): Promise<Response> => {
  const response = await next();

  // Create a new response so we can mutate the headers without
  // touching the original (CF Pages responses are sometimes
  // immutable depending on origin).
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) {
      headers.set(name, value);
    }
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

// CF Pages runs middleware in array order, each wrapping the next via
// next(). securityHeaders is outermost so its header set lands on the
// final (possibly meta-rewritten) response.
export const onRequest = [securityHeaders, seoMeta];

// Exported for unit tests.
export const __SECURITY_HEADERS__ = SECURITY_HEADERS;
export const __securityHeaders__ = securityHeaders;
