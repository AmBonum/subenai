// AH-15.5 batch 4 — locale-aware resolver for the legal pages
// (/privacy and /cookies). Kept in its own namespace because the copy is
// dense, edited independently from product chrome, and keeping its JSON
// files small makes review tractable.
import sk from "./locales/sk/legal.json";
import en from "./locales/en/legal.json";
import cs from "./locales/cs/legal.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({ sk, en, cs });
