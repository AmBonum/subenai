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

export const onRequest: PagesFunction = async ({ next }) => {
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

// Exported for unit tests.
export const __SECURITY_HEADERS__ = SECURITY_HEADERS;
