// Lightweight i18n helper for AH-8.1 public respondent flow (/t/$shareId).
// AH-15.1 — locale-aware. See `_create-resolver.ts` for lookup semantics.
import sk from "./locales/sk/respondent-flow.json";
import en from "./locales/en/respondent-flow.json";
import cs from "./locales/cs/respondent-flow.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({ sk, en, cs });
