import { test, expect } from "@playwright/test";

// E48-v3 — list_admin_users RPC integration tests.
//
// Covers:
//   - happy path: admin JWT returns an array of admin profiles
//   - auth gate: anon key only → 401/403 or empty result
//
// Requires:
//   SUPPORT_LIVE_DB=1
//   SUPABASE_E2E_URL=https://<project>.supabase.co
//   SUPABASE_E2E_ANON_KEY=<anon key>
//   SUPPORT_ADMIN_JWT=<admin-role JWT>

const LIVE_DB = Boolean(process.env.SUPPORT_LIVE_DB);
const SUPABASE_URL = process.env.SUPABASE_E2E_URL ?? "";
const ANON_KEY = process.env.SUPABASE_E2E_ANON_KEY ?? "";
const ADMIN_JWT = process.env.SUPPORT_ADMIN_JWT ?? "";

const RPC = `${SUPABASE_URL}/rest/v1/rpc/list_admin_users`;

test.describe("E48-v3 — list_admin_users RPC", () => {
  test.skip(
    !LIVE_DB || !SUPABASE_URL || !ANON_KEY || !ADMIN_JWT,
    "live Supabase required — see file header for env vars",
  );

  test("happy path: admin JWT returns array of user objects", async ({ request }) => {
    const r = await request.post(RPC, {
      headers: {
        apikey: ANON_KEY,
        authorization: `Bearer ${ADMIN_JWT}`,
        "content-type": "application/json",
      },
      data: {},
    });
    expect(r.status()).toBe(200);
    const body = (await r.json()) as unknown;
    expect(Array.isArray(body)).toBe(true);
    if ((body as unknown[]).length > 0) {
      const first = (body as Record<string, unknown>[])[0];
      expect(first).toHaveProperty("user_id");
      expect(first).toHaveProperty("email");
    }
  });

  test("auth gate: anon key only → 401/403 or empty array", async ({ request }) => {
    const r = await request.post(RPC, {
      headers: {
        apikey: ANON_KEY,
        "content-type": "application/json",
      },
      data: {},
    });
    if (r.status() === 200) {
      // If the RPC has a SECURITY DEFINER guard that returns empty rather
      // than raising, an empty array satisfies the information-boundary.
      expect(await r.json()).toEqual([]);
    } else {
      expect([401, 403]).toContain(r.status());
    }
  });
});
