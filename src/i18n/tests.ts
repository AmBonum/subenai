// Lightweight i18n helper for AH-5 tests/audiences/templates/history routes.
// AH-15.1 — locale-aware. See `_create-resolver.ts` for lookup semantics.
import sk from "./locales/sk/tests.json";
import en from "./locales/en/tests.json";
import cs from "./locales/cs/tests.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({ sk, en, cs });
