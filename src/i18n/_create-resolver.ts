// AH-15.1 — shared locale-aware resolver factory.
//
// Each namespace module (`app-shell.ts`, `admin.ts`, ...) historically held
// its own copy of the resolver logic. With locale support landing, all of
// them collapse onto this single helper. Call shape is unchanged so existing
// consumers keep using `tFor("section")("key.path", vars)`.
//
// Lookup order: current locale → sk fallback → return the raw key.
//
// Perf note: this resolver is intentionally hook-free so it works in both
// component render AND module top-level / `head()` lifecycle calls (which
// AH-15.6 introduced). Instant re-render on locale switch is handled by
// remounting the tree under LocaleProvider via `key={locale}` — see
// `locale-context.tsx`.
import { getCurrentLocale, type Locale } from "./locale-context";

type Json = string | { [k: string]: Json };

function resolve(node: Json | undefined, path: string): string | null {
  if (node === undefined) return null;
  const parts = path.split(".");
  let cur: Json = node;
  for (const p of parts) {
    if (typeof cur === "string") return cur;
    if (cur && typeof cur === "object" && p in cur) {
      cur = cur[p];
    } else {
      return null;
    }
  }
  return typeof cur === "string" ? cur : null;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

function pickSection(root: Json, section: string): Json {
  if (typeof root === "object" && root !== null && section in root) {
    return (root as Record<string, Json>)[section];
  }
  return root;
}

export function createResolver(bundles: Record<Locale, Json>) {
  return function tFor(section: string) {
    return (key: string, vars?: Record<string, string | number>) => {
      const locale = getCurrentLocale();
      const localeSection = pickSection(bundles[locale], section);
      const skSection = pickSection(bundles.sk, section);
      const value = resolve(localeSection, key) ?? resolve(skSection, key) ?? key;
      return interpolate(value, vars);
    };
  };
}
