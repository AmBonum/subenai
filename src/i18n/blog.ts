// E16.2 — blog UI namespace. SK-only in v1 per locked decision #4 in
// tasks/PLAN-2026-05-19-blog-content-engine.md. en + cs loaders are
// intentionally omitted; the resolver falls back to sk for both locales
// until E18 trilingual expansion lands.
import sk from "./locales/sk/blog.json";
import { createResolver } from "./_create-resolver";

export const tFor = createResolver({
  sk,
  loaders: {},
});
