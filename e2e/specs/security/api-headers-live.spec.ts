// E41 — live security headers on `/api/*` responses.
//
// The Vitest spec `tests/security/api-middleware-headers.test.ts`
// proves the middleware logic is correct in isolation. This e2e
// spec hits the REAL Pages Functions API (via `wrangler pages dev`
// on port 8788 or against any `API_BASE_URL` env override) and
// asserts the headers actually arrive on the wire — catching any
// CF runtime quirk that strips them.
//
// Skips with a clear message if the API server isn't reachable so
// CI doesn't fail when this is run against a static-only preview.

import { test, expect } from "../../fixtures/base";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:8788";

const REQUIRED_HEADERS = [
  "strict-transport-security",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
  "content-security-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
] as const;

async function pingApi(request: Parameters<typeof test>[0]["request"]): Promise<boolean> {
  try {
    const resp = await request.head(`${API_BASE}/api/portal-magic-link`);
    return resp.status() > 0;
  } catch {
    return false;
  }
}

test.describe("API security headers — live (E41)", () => {
  test("TC-API-01: portal-magic-link OPTIONS / preflight carries every security header", async ({
    request,
  }) => {
    test.skip(
      !(await pingApi(request)),
      `Skipping: API at ${API_BASE} not reachable. Run \`npm run dev:api\` first.`,
    );

    // We don't actually send a magic link — just inspect the response
    // headers. A 400 / 405 from the handler is fine as long as the
    // headers arrived.
    const resp = await request.fetch(`${API_BASE}/api/portal-magic-link`, {
      method: "POST",
      data: {},
    });
    for (const header of REQUIRED_HEADERS) {
      expect(resp.headers()[header], `missing "${header}" — middleware didn't apply`).toBeTruthy();
    }
    expect(resp.headers()["x-content-type-options"]).toBe("nosniff");
    expect(resp.headers()["x-frame-options"]).toBe("DENY");
  });

  test("TC-API-02: error responses (4xx) still carry security headers", async ({ request }) => {
    test.skip(!(await pingApi(request)), `Skipping: API at ${API_BASE} not reachable.`);

    // Force a 401 by calling export-data without an Authorization header.
    const resp = await request.post(`${API_BASE}/api/account/export-data`);
    expect(resp.status()).toBe(401);
    expect(resp.headers()["x-content-type-options"]).toBe("nosniff");
    expect(resp.headers()["strict-transport-security"]).toMatch(/max-age=\d+/);
  });
});
