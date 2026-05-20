// E35.5 — headers contract for `public/_headers`.
//
// Locks the expected security-header values + the CSP allowlist subset.
// The test reads `public/_headers` and asserts each rule below holds.
//
// When a legitimate CSP widening lands, bump the expected set HERE in
// the same change as `_headers`. The diff makes the security review
// trivial; the test prevents silent drift.

export const EXPECTED_HEADERS = {
  /** RFC 6797 — HSTS. 2 years, includeSubDomains, preload. */
  hstsMinMaxAge: 31_536_000,
  /** Frame-busting. */
  xFrameOptions: "DENY",
  /** Sniffing-prevention. */
  xContentTypeOptions: "nosniff",
  /** Referer leakage. */
  referrerPolicy: "strict-origin-when-cross-origin",
  /** Permissions denied: camera, microphone, geolocation, interest-cohort (FLoC). */
  permissionsPolicyDeniedFeatures: ["camera", "microphone", "geolocation", "interest-cohort"],
} as const;

/** CSP directives we require to be at least this restrictive. */
export const CSP_REQUIRED_DIRECTIVES = [
  "default-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "worker-src 'self' blob:",
] as const;

/**
 * Explicit allowlist of third-party hosts permitted in each CSP directive.
 * The test asserts the served CSP is a SUBSET of these — any new host
 * added to `_headers` without an update here fails the test by design.
 */
export const CSP_ALLOWLIST: Record<string, readonly string[]> = {
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "https://js.stripe.com",
    "https://checkout.stripe.com",
    "https://challenges.cloudflare.com",
    "https://www.googletagmanager.com",
  ],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": [
    "'self'",
    "data:",
    "https://*.stripe.com",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://www.googletagmanager.com",
    "https://www.google.com",
    "https://www.google.sk",
    "https://*.google.com",
    "https://*.google.sk",
  ],
  "font-src": ["'self'", "data:"],
  "connect-src": [
    "'self'",
    "https://*.supabase.co",
    "https://api.stripe.com",
    "https://q.stripe.com",
    "https://checkout.stripe.com",
    "https://challenges.cloudflare.com",
    "https://www.google-analytics.com",
    "https://*.google-analytics.com",
    "https://analytics.google.com",
    "https://*.analytics.google.com",
    "https://www.googletagmanager.com",
  ],
  "frame-src": [
    "'self'",
    "https://js.stripe.com",
    "https://hooks.stripe.com",
    "https://checkout.stripe.com",
    "https://challenges.cloudflare.com",
  ],
  "form-action": ["'self'", "https://checkout.stripe.com"],
};

/** Directives that explicitly may not appear (privacy / supply-chain risk). */
export const CSP_FORBIDDEN_TOKENS = [
  "'unsafe-eval'",
  "*",
  "https://connect.facebook.net",
  "https://platform.twitter.com",
  "https://platform.linkedin.com",
] as const;
