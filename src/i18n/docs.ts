// E47.1 / E48.1 — i18n resolver for the /docs/* stub pages. Lives in
// its own namespace so that adding doc content over time doesn't bloat
// the existing admin / app-shell / app-explainers bundles.
import sk from "./locales/sk/docs.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({
  sk,
  loaders: {
    en: () => import("./locales/en/docs.json").then((m) => m.default),
    cs: () => import("./locales/cs/docs.json").then((m) => m.default),
  },
});
