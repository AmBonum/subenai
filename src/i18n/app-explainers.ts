// E48 — dedicated namespace for /app section explainer panels (the
// AppPageExplainer component reads from `explainers.<pageKey>.*`).
// Mirrors the admin equivalent at `src/i18n/admin.ts` but with its own
// JSON bundles so locale lazy-loading stays scoped.
import sk from "./locales/sk/app-explainers.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({
  sk,
  loaders: {
    en: () => import("./locales/en/app-explainers.json").then((m) => m.default),
    cs: () => import("./locales/cs/app-explainers.json").then((m) => m.default),
  },
});
