// E41 — security headers on `/api/*` (Cloudflare Pages Functions).
//
// White-box test of `functions/_middleware.ts`. The black-box live
// run lives in `e2e/specs/security/api-headers-live.spec.ts` — that
// hits the dev API server and asserts the headers are actually
// served. This spec proves the middleware logic is correct in
// isolation by passing a synthetic upstream response and inspecting
// what the wrapper produced.

import { describe, expect, it } from "vitest";

import { __SECURITY_HEADERS__, onRequest } from "../../functions/_middleware";

const REQUIRED_HEADERS = [
  "Strict-Transport-Security",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Referrer-Policy",
  "Permissions-Policy",
  "Content-Security-Policy",
  "Cross-Origin-Opener-Policy",
  "Cross-Origin-Resource-Policy",
] as const;

function makeFakeContext(upstream: Response) {
  return {
    next: () => Promise.resolve(upstream),
    request: new Request("https://subenai.sk/api/test"),
    env: {},
    params: {},
    data: {},
    waitUntil: () => undefined,
    passThroughOnException: () => undefined,
    functionPath: "/api/test",
  };
}

describe("functions/_middleware — API security headers", () => {
  it("declares every required security header", () => {
    for (const header of REQUIRED_HEADERS) {
      expect(
        Object.keys(__SECURITY_HEADERS__),
        `__SECURITY_HEADERS__ is missing "${header}" — ZAP scan will re-flag this`,
      ).toContain(header);
    }
  });

  it("X-Content-Type-Options is set to 'nosniff' (closes ZAP 10021)", () => {
    expect(__SECURITY_HEADERS__["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("Strict-Transport-Security has >= 1-year max-age + includeSubDomains + preload (closes ZAP 10035)", () => {
    const hsts = __SECURITY_HEADERS__["Strict-Transport-Security"];
    expect(hsts).toMatch(/max-age=(\d+)/);
    const maxAge = Number(hsts.match(/max-age=(\d+)/)![1]);
    expect(maxAge).toBeGreaterThanOrEqual(31_536_000);
    expect(hsts).toMatch(/includeSubDomains/i);
    expect(hsts).toMatch(/preload/i);
  });

  it("CSP for API responses is the most restrictive 'default-src none' (silences ZAP 10038)", () => {
    const csp = __SECURITY_HEADERS__["Content-Security-Policy"];
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("adds every required header to a plain upstream response", async () => {
    const upstream = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });

    // synthetic minimal context for the middleware
    const wrapped = await onRequest(makeFakeContext(upstream));

    for (const header of REQUIRED_HEADERS) {
      expect(wrapped.headers.get(header), `wrapped response missing "${header}"`).toBeTruthy();
    }
  });

  it("preserves headers the upstream Function set explicitly (e.g. Content-Disposition)", async () => {
    // export_my_data endpoint sets Content-Disposition: attachment.
    // The middleware must NOT clobber it.
    const upstream = new Response(JSON.stringify({ data: 1 }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "content-disposition": 'attachment; filename="x.json"',
        "cache-control": "no-store",
      },
    });

    // synthetic context
    const wrapped = await onRequest(makeFakeContext(upstream));

    expect(wrapped.headers.get("content-disposition")).toBe('attachment; filename="x.json"');
    expect(wrapped.headers.get("cache-control")).toBe("no-store");
  });

  it("preserves the upstream status code (e.g. 401, 500)", async () => {
    const upstream = new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });

    // synthetic context
    const wrapped = await onRequest(makeFakeContext(upstream));

    expect(wrapped.status).toBe(401);
    expect(wrapped.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("does not overwrite security headers if the upstream already set them", async () => {
    // Defensive: if a Function explicitly sets a different
    // Referrer-Policy for some reason, the middleware must honour
    // it rather than blindly replace.
    const upstream = new Response("ok", {
      status: 200,
      headers: { "Referrer-Policy": "same-origin" },
    });

    // synthetic context
    const wrapped = await onRequest(makeFakeContext(upstream));

    expect(wrapped.headers.get("Referrer-Policy")).toBe("same-origin");
  });
});
