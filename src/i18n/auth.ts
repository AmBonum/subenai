// Lightweight i18n helper for AH-13 auth routes (/signup, /auth/callback,
// /forgot-password, /auth/reset-password).
// AH-15.1 — locale-aware. See `_create-resolver.ts` for lookup semantics.
import sk from "./locales/sk/auth.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({
  sk,
  loaders: {
    en: () => import("./locales/en/auth.json").then((m) => m.default),
    cs: () => import("./locales/cs/auth.json").then((m) => m.default),
  },
});
