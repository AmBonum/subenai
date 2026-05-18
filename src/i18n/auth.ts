// Lightweight i18n helper for AH-13 auth routes (/signup, /auth/callback,
// /forgot-password, /auth/reset-password).
// AH-15.1 — locale-aware. See `_create-resolver.ts` for lookup semantics.
import sk from "./locales/sk/auth.json";
import en from "./locales/en/auth.json";
import cs from "./locales/cs/auth.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({ sk, en, cs });
