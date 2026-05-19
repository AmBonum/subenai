// CMS namespace i18n resolver.
// AH-15.1 — locale-aware. See `_create-resolver.ts` for lookup semantics.
import sk from "./locales/sk/cms.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({
  sk,
  loaders: {
    en: () => import("./locales/en/cms.json").then((m) => m.default),
    cs: () => import("./locales/cs/cms.json").then((m) => m.default),
  },
});
