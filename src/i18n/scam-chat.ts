// E53.3 — i18n resolver for the scam-chat widget namespace (sk / en / cs).
// See `_create-resolver.ts` for lookup semantics.
import sk from "./locales/sk/scam-chat.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({
  sk,
  loaders: {
    en: () => import("./locales/en/scam-chat.json").then((m) => m.default),
    cs: () => import("./locales/cs/scam-chat.json").then((m) => m.default),
  },
});
