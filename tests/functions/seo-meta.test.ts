import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  matchRoute,
  isHtmlDocumentRequest,
  resolveMeta,
  rewriteHtmlString,
  escapeHtml,
  jsonLdString,
  handleSeoMeta,
  type SeoMetaEnv,
} from "../../functions/_lib/seo-meta";

const env: SeoMetaEnv = {
  SUPABASE_URL: "https://stub.supabase.co",
  SUPABASE_ANON_KEY: "anon_stub",
};

// Minimal static shell mirroring index.html's head tag set.
const SHELL = `<!doctype html><html lang="sk"><head>
<title>subenai — default</title>
<meta name="description" content="default description" />
<meta property="og:title" content="subenai — default" />
<meta property="og:description" content="default description" />
<meta property="og:url" content="https://subenai.sk/" />
<meta property="og:type" content="website" />
<meta property="og:image" content="https://subenai.sk/og-default.png" />
<meta name="twitter:image" content="https://subenai.sk/og-default.png" />
</head><body><div id="root"></div></body></html>`;

function htmlRequest(path: string): Request {
  return new Request(`https://subenai.sk${path}`, {
    method: "GET",
    headers: { accept: "text/html,application/xhtml+xml" },
  });
}

function shellResponse(status = 200): Response {
  return new Response(SHELL, {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function mockSupabaseRow(row: Record<string, unknown> | null, ok = true) {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
    return new Response(JSON.stringify(row), {
      status: ok ? (row ? 200 : 406) : 500,
      headers: { "content-type": "application/json" },
    });
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("matchRoute", () => {
  it("matches per-item crawlable routes", () => {
    expect(matchRoute("/blog/phishing-101")).toEqual({ kind: "blog", slug: "phishing-101" });
    expect(matchRoute("/r/abc123")).toEqual({ kind: "share-result", slug: "abc123" });
    expect(matchRoute("/t/abc123")).toEqual({ kind: "respondent", slug: "abc123" });
    expect(matchRoute("/s/o-nas")).toEqual({ kind: "cms", slug: "o-nas" });
    expect(matchRoute("/courses/zaklady")).toEqual({ kind: "course", slug: "zaklady" });
    expect(matchRoute("/tests/it-firma")).toEqual({ kind: "pack", slug: "it-firma" });
    expect(matchRoute("/sablony/skola")).toEqual({ kind: "template", slug: "skola" });
  });

  it("ignores index pages and unknown / deep paths", () => {
    expect(matchRoute("/blog")).toBeNull();
    expect(matchRoute("/")).toBeNull();
    expect(matchRoute("/blog/foo/bar")).toBeNull();
    expect(matchRoute("/app/dashboard")).toBeNull();
  });

  it("tolerates a trailing slash", () => {
    expect(matchRoute("/blog/phishing-101/")).toEqual({ kind: "blog", slug: "phishing-101" });
  });
});

describe("isHtmlDocumentRequest", () => {
  it("accepts a GET text/html navigation to a route", () => {
    expect(isHtmlDocumentRequest(htmlRequest("/blog/x"))).toBe(true);
  });

  it("rejects asset paths, api, files, and non-html Accept", () => {
    expect(isHtmlDocumentRequest(htmlRequest("/assets/app.js"))).toBe(false);
    expect(isHtmlDocumentRequest(htmlRequest("/api/results-data"))).toBe(false);
    expect(isHtmlDocumentRequest(htmlRequest("/og-default.png"))).toBe(false);
    expect(isHtmlDocumentRequest(htmlRequest("/sitemap.xml"))).toBe(false);
    const json = new Request("https://subenai.sk/blog/x", {
      method: "GET",
      headers: { accept: "application/json" },
    });
    expect(isHtmlDocumentRequest(json)).toBe(false);
    const post = new Request("https://subenai.sk/blog/x", {
      method: "POST",
      headers: { accept: "text/html" },
    });
    expect(isHtmlDocumentRequest(post)).toBe(false);
  });
});

describe("escaping", () => {
  it("escapeHtml neutralises angle brackets and quotes", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });

  it("jsonLdString neutralises </script>", () => {
    const out = jsonLdString({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c/script");
  });
});

describe("rewriteHtmlString", () => {
  it("rewrites title/description/og + injects canonical, robots, twitter, json-ld", () => {
    const out = rewriteHtmlString(SHELL, {
      title: "Phishing 101 | subenai",
      description: "Naucte sa rozpoznat phishing.",
      canonical: "https://subenai.sk/blog/phishing-101",
      ogImage: "https://cdn.example/og.png",
      ogType: "article",
      robots: "index, follow, max-image-preview:large",
      jsonLd: { "@type": "Article", headline: "Phishing 101" },
    });
    expect(out).toContain("<title>Phishing 101 | subenai</title>");
    expect(out).toContain('content="Naucte sa rozpoznat phishing."');
    expect(out).toContain('property="og:title" content="Phishing 101 | subenai"');
    expect(out).toContain('property="og:image" content="https://cdn.example/og.png"');
    expect(out).toContain('property="og:type" content="article"');
    expect(out).toContain('rel="canonical" href="https://subenai.sk/blog/phishing-101"');
    expect(out).toContain('name="robots" content="index, follow, max-image-preview:large"');
    expect(out).toContain('name="twitter:title"');
    expect(out).toContain("application/ld+json");
    // No raw default title left behind.
    expect(out).not.toContain("<title>subenai — default</title>");
  });

  it("escapes a hostile DB-sourced title (no attribute breakout)", () => {
    const out = rewriteHtmlString(SHELL, {
      title: `"><script>alert(1)</script>`,
      description: "x",
      canonical: "https://subenai.sk/sablony/x",
      ogImage: "https://subenai.sk/og-default.png",
      ogType: "article",
      robots: "index, follow",
    });
    expect(out).not.toContain("<script>alert(1)</script>");
    expect(out).toContain("&lt;script&gt;");
  });
});

describe("resolveMeta", () => {
  it("returns blog meta for a known slug", async () => {
    mockSupabaseRow({
      slug: "phishing-101",
      title: "Phishing 101",
      excerpt: "Uvod do phishingu.",
      seo_title: null,
      seo_description: "SEO popis.",
      canonical_url: null,
      og_image_url: "https://cdn.example/og.png",
      hero_image_url: null,
    });
    const meta = await resolveMeta(env, { kind: "blog", slug: "phishing-101" });
    expect(meta).toMatchObject({
      title: "Phishing 101 | subenai",
      description: "SEO popis.",
      canonical: "https://subenai.sk/blog/phishing-101",
      ogImage: "https://cdn.example/og.png",
      ogType: "article",
    });
  });

  it("returns null for an unknown blog slug (PostgREST 406/empty)", async () => {
    mockSupabaseRow(null, true);
    const meta = await resolveMeta(env, { kind: "blog", slug: "does-not-exist" });
    expect(meta).toBeNull();
  });

  it("builds a viral-loop preview for /r/:shareId", async () => {
    mockSupabaseRow({
      share_id: "abc123",
      final_score: 80,
      percentile: 92,
      personality: "Ostraziry",
    });
    const meta = await resolveMeta(env, { kind: "share-result", slug: "abc123" });
    expect(meta?.title).toContain("80/100");
    expect(meta?.description).toContain("92%");
    expect(meta?.robots).toBe("noindex, nofollow");
    expect(meta?.canonical).toBe("https://subenai.sk/");
  });

  it("rejects a malformed share id without hitting the network", async () => {
    const spy = mockSupabaseRow({});
    const meta = await resolveMeta(env, { kind: "share-result", slug: "!!" });
    expect(meta).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns branded static meta for template/pack/course (no DB)", async () => {
    const tpl = await resolveMeta(env, { kind: "template", slug: "skola" });
    expect(tpl?.title).toContain("šablóna");
    expect(tpl?.canonical).toBe("https://subenai.sk/sablony/skola");
  });
});

describe("handleSeoMeta orchestration", () => {
  beforeEach(() => {
    // Ensure no Cache API in the test env so each call re-resolves.
    delete (globalThis as { caches?: unknown }).caches;
  });

  it("rewrites a known blog page to HTTP 200 with new title/og", async () => {
    mockSupabaseRow({
      slug: "phishing-101",
      title: "Phishing 101",
      excerpt: "Uvod.",
      seo_title: null,
      seo_description: "SEO popis.",
      canonical_url: null,
      og_image_url: "https://cdn.example/og.png",
      hero_image_url: null,
    });
    const res = await handleSeoMeta(htmlRequest("/blog/phishing-101"), env, shellResponse());
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain("<title>Phishing 101 | subenai</title>");
    expect(body).toContain('property="og:image" content="https://cdn.example/og.png"');
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=300");
  });

  it("passes an asset request straight through untouched", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const upstream = new Response("console.log(1)", {
      status: 200,
      headers: { "content-type": "application/javascript" },
    });
    const req = new Request("https://subenai.sk/assets/app.js", {
      method: "GET",
      headers: { accept: "*/*" },
    });
    const res = await handleSeoMeta(req, env, upstream);
    expect(res).toBe(upstream);
    expect(spy).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown DB-backed slug but keeps the shell body", async () => {
    mockSupabaseRow(null, true);
    const res = await handleSeoMeta(htmlRequest("/blog/does-not-exist"), env, shellResponse());
    expect(res.status).toBe(404);
    const body = await res.text();
    // Body is still the SPA shell so humans see the in-app 404 UI.
    expect(body).toContain('<div id="root">');
    expect(body).toContain('name="robots" content="noindex, nofollow"');
  });

  it("passes a non-HTML Accept request through untouched", async () => {
    const spy = vi.spyOn(globalThis, "fetch");
    const upstream = shellResponse();
    const req = new Request("https://subenai.sk/blog/phishing-101", {
      method: "GET",
      headers: { accept: "application/json" },
    });
    const res = await handleSeoMeta(req, env, upstream);
    expect(res).toBe(upstream);
    expect(spy).not.toHaveBeenCalled();
  });

  it("passes through (no 500) when Supabase fetch throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    const upstream = shellResponse();
    const res = await handleSeoMeta(htmlRequest("/blog/x"), env, upstream);
    expect(res).toBe(upstream);
  });
});
