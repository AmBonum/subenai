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
//
// Lazy locales: sk is eager (always bundled — default + fallback). en + cs
// are dynamic-imported on first switch. While a non-sk locale's bundle is
// loading, the resolver returns the sk value (the existing fallback path),
// which is the same UX as a missing key — acceptable for the brief flash.
import { getCurrentLocale, type Locale } from "./locale-context";

type Json = string | { [k: string]: Json };

type LazyLoaders = Partial<Record<Exclude<Locale, "sk">, () => Promise<Json>>>;

// Registry of every namespace's preload functions. The locale-context calls
// `preloadLocale(next)` before flipping state, which fans out across every
// registered namespace in parallel and resolves once they're all warm.
const registry = new Set<(locale: Exclude<Locale, "sk">) => Promise<void>>();

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
  // Walks dotted section paths so `tFor("account.profile")` reaches the
  // nested `account → profile` subtree, mirroring how `resolve` walks
  // dotted key paths. Without this, the resolver did a single-level
  // `"account.profile" in root` check, returned root unchanged, and
  // every key in /app/account/* surfaced as the raw key in production
  // (2026-05-19: card_personal_title, label_display_name, badge_dirty…).
  if (typeof root !== "object" || root === null) return root;
  let cur: Json = root;
  for (const part of section.split(".")) {
    if (typeof cur !== "object" || cur === null || !(part in cur)) return root;
    cur = (cur as Record<string, Json>)[part];
  }
  return cur;
}

export function createResolver(opts: { sk: Json; loaders: LazyLoaders }) {
  const { sk, loaders } = opts;
  // Per-namespace cache of loaded non-sk bundles. Sticky for the page lifetime.
  const loaded: Partial<Record<Exclude<Locale, "sk">, Json>> = {};
  // Per-namespace in-flight promises so concurrent preload calls dedupe.
  const inflight: Partial<Record<Exclude<Locale, "sk">, Promise<void>>> = {};

  function preload(locale: Exclude<Locale, "sk">): Promise<void> {
    if (loaded[locale]) return Promise.resolve();
    const existing = inflight[locale];
    if (existing) return existing;
    const loader = loaders[locale];
    if (!loader) return Promise.resolve();
    const p = loader().then((json) => {
      loaded[locale] = json;
      delete inflight[locale];
    });
    inflight[locale] = p;
    return p;
  }

  registry.add(preload);

  // Stable per-section closure cache. The closure reads getCurrentLocale()
  // at lookup time so it stays correct across locale switches; caching only
  // memoizes the FUNCTION REFERENCE. Without this cache, every `tFor(s)`
  // call returned a new arrow function, so callers that put `t` in
  // useEffect deps (idiomatic per react-hooks/exhaustive-deps) would fire
  // their effect on every render. That caused a production infinite-loop
  // bug in /auth/callback after Google OAuth (2026-05-19): the effect kept
  // re-issuing navigate(), which kept TanStack's route transition pending,
  // which kept re-rendering the component, which kept producing a fresh
  // `t`, which kept the effect deps unstable — 352+ profile_preferences
  // queries per stuck tab.
  const sectionCache = new Map<
    string,
    (key: string, vars?: Record<string, string | number>) => string
  >();

  function tFor(section: string) {
    const cached = sectionCache.get(section);
    if (cached) return cached;
    const fn = (key: string, vars?: Record<string, string | number>) => {
      const locale = getCurrentLocale();
      const skSection = pickSection(sk, section);
      if (locale !== "sk") {
        // Kick off the load for next render. Returns sk fallback this tick.
        const bundle = loaded[locale];
        if (!bundle) {
          void preload(locale);
        } else {
          const localeSection = pickSection(bundle, section);
          const value = resolve(localeSection, key) ?? resolve(skSection, key) ?? key;
          return interpolate(value, vars);
        }
      }
      const value = resolve(skSection, key) ?? key;
      return interpolate(value, vars);
    };
    sectionCache.set(section, fn);
    return fn;
  }

  return tFor;
}

// Fan-out preload across every namespace. Called by LocaleProvider before
// flipping state on switch. Resolves once every registered namespace has
// loaded the requested locale (or has no loader for it, in which case the
// resolver gracefully falls back to sk for that namespace).
export async function preloadLocale(locale: Locale): Promise<void> {
  if (locale === "sk") return;
  await Promise.all(Array.from(registry, (fn) => fn(locale)));
}
