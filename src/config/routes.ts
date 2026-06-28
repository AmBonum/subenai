// E33 — `/test/zostav*` renamed to `/test/builder*` for URL-language
// consistency (every other public route is English). 301 redirects
// in public/_redirects preserve inbound link equity from existing
// blog posts, bookmarks, and social shares. The pre-rename
// `zostav` / `zostava` / `zostavaVysledky` keys are kept as
// deprecation aliases for one release cycle so external callers
// (and any forgotten internal callsite) keep navigating to the
// correct new URL — they POINT AT THE NEW PATH already. Remove
// the alias section in a follow-up release once the codebase is
// fully migrated.
export const ROUTES = {
  home: "/",
  login: "/login",
  docs: "/docs",
  test: "/test",
  testy: "/tests",
  testySlug: "/tests/$slug",
  builder: "/test/builder",
  builderSet: "/test/builder/$id",
  builderResults: "/test/builder/$id/results",
  // Deprecation aliases — point at the new URLs.
  /** @deprecated E33 — use `builder` */
  zostav: "/test/builder",
  /** @deprecated E33 — use `builderSet` */
  zostava: "/test/builder/$id",
  /** @deprecated E33 — use `builderResults` */
  zostavaVysledky: "/test/builder/$id/results",
  sablony: "/sablony",
  skoly: "/schools",
  // E55 — /courses + /blog unified into /academy. These keys are kept as
  // aliases (callsites untouched) and now point at the academy hub. 301
  // redirects in public/_redirects preserve inbound link equity.
  academy: "/academy",
  academySlug: "/academy/$slug",
  /** @deprecated E55 — courses merged into the academy; use `academy` */
  skolenia: "/academy",
  /** @deprecated E55 — course detail is now an academy lesson; use `academySlug` */
  skoleniaSlug: "/academy/$slug",
  podpora: "/support",
  sponzori: "/sponsors",
  /** @deprecated M3 — /sponsors/all merged into /sponsors; use `sponzori` */
  sponzoriVsetci: "/sponsors",
  spravovat: "/manage-support",
  privacy: "/privacy",
  cookies: "/cookies",
  oProjecte: "/about",
  zmeny: "/changelog",
  contact: "/contact",
  contactForm: "/contact-form",
  /** @deprecated E55 — blog merged into the academy; use `academy` */
  blog: "/academy",
} as const;
