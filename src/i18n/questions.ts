// Lightweight i18n helper for the AH-4 questions library + answer sets.
// AH-15.1 — locale-aware. See `_create-resolver.ts` for lookup semantics.
import sk from "./locales/sk/questions.json";
import en from "./locales/en/questions.json";
import cs from "./locales/cs/questions.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({ sk, en, cs });
