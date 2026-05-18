// Lightweight i18n helper for the /admin shell + AH-6 / AH-10 routes.
// AH-15.1 — locale-aware. See `_create-resolver.ts` for lookup semantics.
import sk from "./locales/sk/admin.json";
import en from "./locales/en/admin.json";
import cs from "./locales/cs/admin.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({ sk, en, cs });
