// CMS namespace i18n resolver.
// AH-15.1 — locale-aware. See `_create-resolver.ts` for lookup semantics.
import sk from "./locales/sk/cms.json";
import en from "./locales/en/cms.json";
import cs from "./locales/cs/cms.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({ sk, en, cs });
