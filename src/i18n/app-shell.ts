// Lightweight i18n helper for the /app shell + AH-3 routes.
//
// AH-15.1 — locale-aware resolver. Slovak is the canonical source; en/cs
// stubs are 1:1 clones until AH-15.2+ ships real translations. Missing keys
// in the active locale fall back to sk.
import sk from "./locales/sk/app-shell.json";
import en from "./locales/en/app-shell.json";
import cs from "./locales/cs/app-shell.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({ sk, en, cs });
