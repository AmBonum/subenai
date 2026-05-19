// Lightweight i18n helper for AH-5 tests/audiences/templates/history routes.
// AH-15.1 — locale-aware. See `_create-resolver.ts` for lookup semantics.
import sk from "./locales/sk/tests.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({
  sk,
  loaders: {
    en: () => import("./locales/en/tests.json").then((m) => m.default),
    cs: () => import("./locales/cs/tests.json").then((m) => m.default),
  },
});
