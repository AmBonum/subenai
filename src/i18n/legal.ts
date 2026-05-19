// AH-15.5 batch 4 — locale-aware resolver for the legal pages
// (/privacy and /cookies). Kept in its own namespace because the copy is
// dense, edited independently from product chrome, and keeping its JSON
// files small makes review tractable.
import sk from "./locales/sk/legal.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({
  sk,
  loaders: {
    en: () => import("./locales/en/legal.json").then((m) => m.default),
    cs: () => import("./locales/cs/legal.json").then((m) => m.default),
  },
});
