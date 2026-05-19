// Lightweight i18n helper for the AH-4 questions library + answer sets.
// AH-15.1 — locale-aware. See `_create-resolver.ts` for lookup semantics.
import sk from "./locales/sk/questions.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({
  sk,
  loaders: {
    en: () => import("./locales/en/questions.json").then((m) => m.default),
    cs: () => import("./locales/cs/questions.json").then((m) => m.default),
  },
});
