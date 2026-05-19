// Lightweight i18n helper for AH-7 governance routes (DSR, reports, respondents,
// audit log, DSR queue).
// AH-15.1 — locale-aware. See `_create-resolver.ts` for lookup semantics.
import sk from "./locales/sk/governance.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({
  sk,
  loaders: {
    en: () => import("./locales/en/governance.json").then((m) => m.default),
    cs: () => import("./locales/cs/governance.json").then((m) => m.default),
  },
});
