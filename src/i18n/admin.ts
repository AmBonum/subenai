// Lightweight i18n helper for the /admin shell + AH-6 / AH-10 routes.
// AH-15.1 — locale-aware. See `_create-resolver.ts` for lookup semantics.
import sk from "./locales/sk/admin.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({
  sk,
  loaders: {
    en: () => import("./locales/en/admin.json").then((m) => m.default),
    cs: () => import("./locales/cs/admin.json").then((m) => m.default),
  },
});
