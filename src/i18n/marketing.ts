// AH-15.5 — locale-aware resolver for the public marketing chrome
// (site header, footer, consent banner + preferences, locale switcher aria).
// See `_create-resolver.ts` for lookup semantics.
//
// sk is eager (default + fallback). en + cs lazy-load on first switch.
import sk from "./locales/sk/marketing.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({
  sk,
  loaders: {
    en: () => import("./locales/en/marketing.json").then((m) => m.default),
    cs: () => import("./locales/cs/marketing.json").then((m) => m.default),
  },
});
