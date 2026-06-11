// E50 — per-route social/crawler metadata injection for the CSR SPA.
//
// The app is a pure client-rendered SPA (src/main.tsx createRoot; no
// SSR). Social crawlers (FB/WhatsApp/LinkedIn/X/Slack) don't execute JS,
// so the per-route head() meta the SPA emits after hydration is invisible
// to them — they only ever see the static index.html shell defaults.
//
// This module resolves per-route metadata from Supabase anon REST and
// rewrites the static shell's <title>, description, canonical and og:/
// twitter: tags so crawlers get correct link previews. It is wired into
// functions/_middleware.ts (see the onRequest array there) rather than a
// separate functions/[[path]].ts catch-all because:
//   - CF Pages middleware composes via next(): it receives the response
//     the asset pipeline already produced (the SPA-fallback index.html)
//     and transforms it. A [[path]].ts catch-all would instead SHADOW
//     every route — including /api/* (handled by their own Functions)
//     and static assets — forcing us to re-implement asset serving and
//     risking precedence bugs. Middleware is the idiomatic "transform
//     the outgoing HTML" layer.
//   - Chaining after the existing security-header middleware keeps the
//     HSTS/CSP/etc. injection intact (it wraps our rewritten response).
//
// Values are HTML-escaped before injection (DB-sourced, some
// user-submitted, e.g. /sablony). HTMLRewriter.setAttribute escapes
// attribute values itself; JSON-LD injected as element text needs
// </script> neutralisation, mirrored here from src/lib/seo/json-ld.ts
// (can't import across the src/ <-> functions/ bundler boundary).

import { PROD_SUPABASE_URL } from "./supabase-url";

const SITE_ORIGIN = "https://subenai.sk";
const OG_DEFAULT = `${SITE_ORIGIN}/og-default.png`;

// Rewritten-HTML cache TTL. Crawlers re-fetch the same share/blog URL
// repeatedly; 300s amortises the Supabase round-trip without serving
// stale previews for long after a blog/CMS edit. Error responses are
// never cached (see fetchMeta callers — a null/throw skips Cache.put).
const CACHE_TTL_SECONDS = 300;

export interface SeoMetaEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

export interface RouteMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage: string;
  ogType: string;
  robots: string;
  /** Optional JSON-LD object injected as a <script type="application/ld+json">. */
  jsonLd?: unknown;
}

// Mirror of src/lib/seo/json-ld.ts — neutralises a "</script>" inside any
// DB field so it can't close the JSON-LD script tag early. Cannot import
// from src/ (different bundler / alias graph).
export function jsonLdString(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

// Belt-and-suspenders HTML escape for text we inject ourselves. The
// HTMLRewriter attribute path escapes on its own; this is for the
// string-fallback rewriter (test/no-runtime) and for JSON-LD wrappers.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type RouteKind = "blog" | "cms" | "share-result" | "respondent" | "template" | "pack" | "course";

export interface RouteMatch {
  kind: RouteKind;
  slug: string;
}

// Path -> route descriptor. Only the per-item crawlable surfaces named
// in the spec. Index pages (/blog, /courses, ...) keep the static shell
// defaults (cheap + correct: they're generic landing copy).
export function matchRoute(pathname: string): RouteMatch | null {
  const seg = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  if (seg.length !== 2) return null;
  const [head, slug] = seg;
  if (!slug) return null;
  switch (head) {
    case "blog":
      return { kind: "blog", slug };
    case "s":
      return { kind: "cms", slug };
    case "r":
      return { kind: "share-result", slug };
    case "t":
      return { kind: "respondent", slug };
    case "sablony":
      return { kind: "template", slug };
    case "tests":
      return { kind: "pack", slug };
    case "courses":
      return { kind: "course", slug };
    default:
      return null;
  }
}

// True only for HTML *document* navigations we should rewrite. Excludes
// /assets/*, /api/*, anything with a file extension (.js/.css/.png/...),
// and non-GET. Crawlers send `Accept: text/html`; we additionally guard
// on the path so an asset requested with a stray text/html Accept (rare)
// still passes through untouched.
export function isHtmlDocumentRequest(request: Request): boolean {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  const path = url.pathname;
  if (path.startsWith("/api/") || path.startsWith("/assets/")) return false;
  // Any path whose last segment contains a dot is treated as a file
  // (foo.js, sitemap.xml, og-default.png). Route slugs never contain dots.
  const last = path.split("/").pop() ?? "";
  if (last.includes(".")) return false;
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("text/html");
}

// Lookup failure must NOT masquerade as "row doesn't exist": a missing
// env key or a Supabase 5xx would otherwise 404 every DB-backed page
// site-wide. Only PostgREST 406 (object+json accept with zero rows) is a
// definitive miss; everything else throws MetaUnavailableError and the
// caller passes the shell through untouched.
export class MetaUnavailableError extends Error {
  constructor(public reason: string) {
    super(`seo-meta unavailable: ${reason}`);
  }
}

async function supabaseSelect(
  env: SeoMetaEnv,
  path: string,
): Promise<Record<string, unknown> | null> {
  const key = env.SUPABASE_ANON_KEY;
  if (!key) throw new MetaUnavailableError("no-anon-key");
  // PROD_SUPABASE_URL directly — env.SUPABASE_URL on CF Pages is stale
  // (retired project, fetch → 530; see _lib/supabase-url.ts). Same
  // precedence every other Function uses.
  const base = PROD_SUPABASE_URL;
  let res: Response;
  try {
    res = await fetch(`${base}/rest/v1/${path}`, {
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        accept: "application/vnd.pgrst.object+json",
      },
    });
  } catch {
    throw new MetaUnavailableError("network");
  }
  if (res.status === 406) return null;
  if (!res.ok) throw new MetaUnavailableError(`rest-${res.status}`);
  try {
    const body = (await res.json()) as Record<string, unknown> | null;
    return body && typeof body === "object" ? body : null;
  } catch {
    throw new MetaUnavailableError("bad-json");
  }
}

function str(row: Record<string, unknown>, k: string): string | null {
  const v = row[k];
  return typeof v === "string" && v.length > 0 ? v : null;
}

async function blogMeta(env: SeoMetaEnv, slug: string): Promise<RouteMeta | null> {
  const q =
    `blog_posts?slug=eq.${encodeURIComponent(slug)}&status=eq.published` +
    `&published_at=lte.${encodeURIComponent(new Date().toISOString())}` +
    `&select=slug,title,excerpt,seo_title,seo_description,canonical_url,og_image_url,hero_image_url`;
  const row = await supabaseSelect(env, q);
  if (!row) return null;
  const title = str(row, "seo_title") ?? `${str(row, "title") ?? slug} | subenai`;
  const description = str(row, "seo_description") ?? str(row, "excerpt") ?? "";
  const url = `${SITE_ORIGIN}/blog/${slug}`;
  return {
    title,
    description,
    canonical: str(row, "canonical_url") ?? url,
    ogImage: str(row, "og_image_url") ?? str(row, "hero_image_url") ?? OG_DEFAULT,
    ogType: "article",
    robots: "index, follow, max-image-preview:large",
  };
}

async function cmsMeta(env: SeoMetaEnv, slug: string): Promise<RouteMeta | null> {
  const q =
    `cms_pages?slug=eq.${encodeURIComponent(slug)}&status=eq.published` +
    `&published_at=not.is.null&select=slug,title,seo_description`;
  const row = await supabaseSelect(env, q);
  if (!row) return null;
  const title = str(row, "title") ?? slug;
  const description = str(row, "seo_description") ?? "";
  const url = `${SITE_ORIGIN}/s/${slug}`;
  return {
    title: `${title} | subenai`,
    description,
    canonical: url,
    ogImage: OG_DEFAULT,
    ogType: "website",
    robots: "index, follow, max-image-preview:large",
  };
}

// /r/:shareId — share results, the viral loop. The attempt row is anon-
// readable by share_id. noindex (each is a unique personal-result URL)
// but a rich preview drives clicks. Canonical points to the site root so
// the backlink credits the homepage (matches the SPA head()).
async function shareResultMeta(env: SeoMetaEnv, shareId: string): Promise<RouteMeta | null> {
  if (!/^[a-zA-Z0-9]{6,12}$/.test(shareId)) return null;
  const q =
    `attempts?share_id=eq.${encodeURIComponent(shareId)}` +
    `&select=share_id,final_score,percentile,personality`;
  const row = await supabaseSelect(env, q);
  if (!row) return null;
  const score = typeof row.final_score === "number" ? row.final_score : null;
  const percentile = typeof row.percentile === "number" ? row.percentile : null;
  const scoreText = score !== null ? `Skóre ${score}/100` : "Pozri si môj výsledok";
  const desc =
    percentile !== null
      ? `${scoreText} — lepší ako ${percentile}% ľudí. Otestuj sa aj ty.`
      : `${scoreText}. Otestuj sa aj ty.`;
  return {
    title: `${scoreText} | subenai`,
    description: desc,
    canonical: `${SITE_ORIGIN}/`,
    ogImage: OG_DEFAULT,
    ogType: "website",
    robots: "noindex, nofollow",
  };
}

// /t/:shareId — respondent take page. noindex; no DB lookup needed (the
// take flow is gated and personal). Static-ish meta keeps the preview
// branded without leaking respondent data.
function respondentMeta(shareId: string): RouteMeta | null {
  if (!/^[a-zA-Z0-9]{6,64}$/.test(shareId)) return null;
  return {
    title: "Vyplň test | subenai",
    description: "Pozvánka na test online bezpečnosti.",
    canonical: `${SITE_ORIGIN}/`,
    ogImage: OG_DEFAULT,
    ogType: "website",
    robots: "noindex, nofollow",
  };
}

// /sablony/:slug, /tests/:slug, /courses/:slug resolve their content from
// in-bundle registries / RPCs the SPA reads client-side, not from a plain
// anon table this Function can query cheaply. We emit branded static-ish
// per-kind meta (better than the generic homepage shell, never a 404 for
// a syntactically valid slug — the SPA validates existence client-side).
function staticKindMeta(kind: "template" | "pack" | "course", slug: string): RouteMeta {
  const base = {
    canonical: `${SITE_ORIGIN}/${kind === "template" ? "sablony" : kind === "pack" ? "tests" : "courses"}/${slug}`,
    ogImage: OG_DEFAULT,
    robots: "index, follow, max-image-preview:large",
  };
  if (kind === "template") {
    return {
      ...base,
      title: "Test šablóna | subenai",
      description:
        "Bezplatná šablóna kvízu o online bezpečnosti — pustite kolegom, žiakom alebo rodine. Slovenčina, CC BY 4.0.",
      ogType: "article",
    };
  }
  if (kind === "pack") {
    return {
      ...base,
      title: "Test | subenai",
      description: "Interaktívny test na rozpoznávanie online podvodov.",
      ogType: "website",
    };
  }
  return {
    ...base,
    title: "Kurz | subenai",
    description: "Kurz na rozpoznávanie online podvodov.",
    ogType: "article",
  };
}

// Returns the resolved meta, or null when the slug is unknown for a
// DB-backed route (caller turns null into a 404). DB-independent kinds
// (respondent/template/pack/course) never return null for a valid slug.
export async function resolveMeta(env: SeoMetaEnv, match: RouteMatch): Promise<RouteMeta | null> {
  switch (match.kind) {
    case "blog":
      return blogMeta(env, match.slug);
    case "cms":
      return cmsMeta(env, match.slug);
    case "share-result":
      return shareResultMeta(env, match.slug);
    case "respondent":
      return respondentMeta(match.slug);
    case "template":
      return staticKindMeta("template", match.slug);
    case "pack":
      return staticKindMeta("pack", match.slug);
    case "course":
      return staticKindMeta("course", match.slug);
    default:
      return null;
  }
}

// DB-backed routes whose miss is a genuine 404. The others resolve from
// the SPA bundle, so the Function can't authoritatively 404 them.
export function isDbBackedKind(kind: RouteKind): boolean {
  return kind === "blog" || kind === "cms" || kind === "share-result";
}

// String-based rewriter. The production path uses HTMLRewriter (below)
// when the runtime provides it; this deterministic fallback runs in the
// test env (jsdom/Node has no HTMLRewriter) and as a safety net. It
// rewrites the same tag set HTMLRewriter targets.
export function rewriteHtmlString(html: string, meta: RouteMeta): string {
  const t = escapeHtml(meta.title);
  const d = escapeHtml(meta.description);
  const img = escapeHtml(meta.ogImage);
  const canon = escapeHtml(meta.canonical);
  const type = escapeHtml(meta.ogType);

  let out = html
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${t}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="description" content="${d}" />`,
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:title" content="${t}" />`,
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:description" content="${d}" />`,
    )
    .replace(
      /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:url" content="${canon}" />`,
    )
    .replace(
      /<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:type" content="${type}" />`,
    )
    .replace(
      /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta property="og:image" content="${img}" />`,
    )
    .replace(
      /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/i,
      `<meta name="twitter:image" content="${img}" />`,
    );

  // Inject robots + canonical + twitter title/description + JSON-LD that
  // the static shell doesn't carry, right before </head>.
  const inject: string[] = [
    `<meta name="robots" content="${escapeHtml(meta.robots)}" />`,
    `<link rel="canonical" href="${canon}" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
  ];
  if (meta.jsonLd !== undefined) {
    inject.push(`<script type="application/ld+json">${jsonLdString(meta.jsonLd)}</script>`);
  }
  out = out.replace(/<\/head>/i, `${inject.join("\n    ")}\n  </head>`);
  return out;
}

// Rewrites the HTML response with the resolved meta + the desired status.
// Production path uses HTMLRewriter (streaming, runtime-native); when it
// is absent (Node/jsdom test runner) we await the body and string-rewrite.
// Preserves the original headers (so the security-header middleware that
// wraps us, plus _headers CSP, stay intact) and sets a short s-maxage so
// CF's edge cache absorbs repeat crawler hits without re-querying Supabase.
export async function applyMetaToResponse(
  response: Response,
  meta: RouteMeta,
  status: number,
): Promise<Response> {
  const headers = new Headers(response.headers);
  headers.set(
    "Cache-Control",
    `public, max-age=0, s-maxage=${CACHE_TTL_SECONDS}, stale-while-revalidate=60`,
  );

  const HR = (globalThis as { HTMLRewriter?: unknown }).HTMLRewriter as
    | (new () => HtmlRewriterLike)
    | undefined;

  if (!HR) {
    const text = await response.text();
    return new Response(rewriteHtmlString(text, meta), {
      status,
      statusText: response.statusText,
      headers,
    });
  }

  const rewritten = rewriteHtmlResponse(response, meta);
  return new Response(rewritten.body, {
    status,
    statusText: response.statusText,
    headers,
  });
}

// Production rewrite via HTMLRewriter (streaming, runtime-native).
function rewriteHtmlResponse(response: Response, meta: RouteMeta): Response {
  const HR = (globalThis as { HTMLRewriter?: unknown }).HTMLRewriter as new () => HtmlRewriterLike;
  const titleText = meta.title;
  const rewriter = new HR()
    .on("title", {
      element(el) {
        el.setInnerContent(titleText);
      },
    })
    .on('meta[name="description"]', setAttr("content", meta.description))
    .on('meta[property="og:title"]', setAttr("content", meta.title))
    .on('meta[property="og:description"]', setAttr("content", meta.description))
    .on('meta[property="og:url"]', setAttr("content", meta.canonical))
    .on('meta[property="og:type"]', setAttr("content", meta.ogType))
    .on('meta[property="og:image"]', setAttr("content", meta.ogImage))
    .on('meta[name="twitter:image"]', setAttr("content", meta.ogImage))
    .on("head", {
      element(el) {
        const parts = [
          `<meta name="robots" content="${escapeHtml(meta.robots)}">`,
          `<link rel="canonical" href="${escapeHtml(meta.canonical)}">`,
          `<meta name="twitter:title" content="${escapeHtml(meta.title)}">`,
          `<meta name="twitter:description" content="${escapeHtml(meta.description)}">`,
        ];
        if (meta.jsonLd !== undefined) {
          parts.push(`<script type="application/ld+json">${jsonLdString(meta.jsonLd)}</script>`);
        }
        el.append(parts.join(""), { html: true });
      },
    });

  return rewriter.transform(response);
}

interface HtmlRewriterLike {
  on(selector: string, handlers: ElementHandlers): HtmlRewriterLike;
  transform(response: Response): Response;
}
interface ElementHandlers {
  element(element: ElementLike): void;
}
interface ElementLike {
  setAttribute(name: string, value: string): void;
  setInnerContent(content: string): void;
  append(content: string, opts: { html: boolean }): void;
}

function setAttr(name: string, value: string): ElementHandlers {
  return {
    element(el) {
      el.setAttribute(name, value);
    },
  };
}

// Orchestrator wired into _middleware.ts. Receives the upstream response
// (the SPA-fallback index.html that next() produced) and either rewrites
// it with per-route meta or passes it through untouched.
//
// 404 approach: for DB-backed routes (blog/cms/share-result) an unknown
// slug returns HTTP 404 — fixing today's soft-404 (200 + client "not
// found") so crawlers de-index dead URLs. We still serve the (rewritten,
// noindex) shell body so the SPA boots and humans see the app's own
// friendly not-found UI rather than a blank browser error page. Trade-off:
// the status line says 404 while the body is a full HTML app — correct
// for crawlers, transparent for humans (the SPA renders its 404 route).
//
// Caching: rewritten HTML is cached in the CF Cache API keyed by pathname
// for CACHE_TTL_SECONDS. Error/404 responses are NOT cached (a freshly
// published slug must go live without waiting out a TTL). Cache is best-
// effort — absent (tests) or a miss simply re-resolves.
export async function handleSeoMeta(
  request: Request,
  env: SeoMetaEnv,
  upstream: Response,
): Promise<Response> {
  if (!isHtmlDocumentRequest(request)) return upstream;
  const url = new URL(request.url);
  const match = matchRoute(url.pathname);
  if (!match) return upstream;

  const cache = (globalThis as { caches?: { default?: CacheLike } }).caches?.default;
  const cacheKey = `${SITE_ORIGIN}${url.pathname}`;
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  let meta: RouteMeta | null;
  try {
    meta = await resolveMeta(env, match);
  } catch (err) {
    // Never 500 a page request on a Supabase blip — pass the shell through.
    // The x-seo-meta header makes the failure observable on prod (no log
    // access) without changing what humans/crawlers see.
    const reason = err instanceof MetaUnavailableError ? err.reason : "error";
    return withDebugHeader(upstream, `unavailable-${reason}`);
  }

  if (!meta) {
    if (isDbBackedKind(match.kind)) {
      // Unknown slug on a DB-backed route → real 404, but keep the shell
      // body + a noindex robots tag so humans still get the SPA's 404 UI.
      const notFoundMeta: RouteMeta = {
        title: "Nenájdené | subenai",
        description: "Stránka nebola nájdená.",
        canonical: `${SITE_ORIGIN}${url.pathname}`,
        ogImage: OG_DEFAULT,
        ogType: "website",
        robots: "noindex, nofollow",
      };
      const nf = await applyMetaToResponse(upstream, notFoundMeta, 404);
      return withDebugHeader(nf, "not-found");
    }
    return upstream;
  }

  const rewritten = await applyMetaToResponse(upstream, meta, upstream.status || 200);
  const tagged = withDebugHeader(rewritten, "rewrite");
  if (cache && tagged.status === 200) {
    try {
      await cache.put(cacheKey, tagged.clone());
    } catch {
      // Body may already be consumed in some runtimes; cache is best-effort.
    }
  }
  return tagged;
}

// Diagnosis channel for a runtime we can't tail logs from: every handled
// (route-matched) response carries x-seo-meta so `curl -I` on prod tells
// us which branch ran. Headers may be immutable on passthrough responses,
// hence the re-wrap.
function withDebugHeader(response: Response, value: string): Response {
  try {
    response.headers.set("x-seo-meta", value);
    return response;
  } catch {
    const headers = new Headers(response.headers);
    headers.set("x-seo-meta", value);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }
}

interface CacheLike {
  match(key: string): Promise<Response | undefined>;
  put(key: string, response: Response): Promise<void>;
}

export { CACHE_TTL_SECONDS, SITE_ORIGIN, OG_DEFAULT };
