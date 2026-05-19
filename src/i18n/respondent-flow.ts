// Lightweight i18n helper for AH-8.1 public respondent flow (/t/$shareId).
// AH-15.1 — locale-aware. See `_create-resolver.ts` for lookup semantics.
import sk from "./locales/sk/respondent-flow.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({
  sk,
  loaders: {
    en: () => import("./locales/en/respondent-flow.json").then((m) => m.default),
    cs: () => import("./locales/cs/respondent-flow.json").then((m) => m.default),
  },
});
