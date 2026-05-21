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
  skoly: "/schools",
  skolenia: "/courses",
  skoleniaSlug: "/courses/$slug",
  podpora: "/support",
  sponzori: "/sponsors",
  sponzoriVsetci: "/sponsors/all",
  spravovat: "/manage-support",
  privacy: "/privacy",
  cookies: "/cookies",
  oProjecte: "/about",
  zmeny: "/changelog",
  kontakt: "/kontakt",
  blog: "/blog",
} as const;
