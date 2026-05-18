// AH-15.5 — locale-aware resolver for the public marketing chrome
// (site header, footer, consent banner + preferences, locale switcher aria).
// See `_create-resolver.ts` for lookup semantics.
import sk from "./locales/sk/marketing.json";
import en from "./locales/en/marketing.json";
import cs from "./locales/cs/marketing.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({ sk, en, cs });
