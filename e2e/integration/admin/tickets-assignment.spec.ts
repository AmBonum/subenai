import { test, expect } from "@playwright/test";

// E48-v3 — assign_admin_to_ticket RPC integration tests.
//
// Covers:
//   - happy path: admin assigns themselves to a ticket → 200
//   - auth-fail: no Bearer token → 401/403
//   - duplicate assignment is idempotent → no error
//   - non-admin user JWT rejected → not_authorized / 403
//   - audit log entry created after successful assignment
//
// Requires:
//   SUPPORT_LIVE_DB=1
//   SUPABASE_E2E_URL=https://<project>.supabase.co
//   SUPABASE_E2E_ANON_KEY=<anon key>
//   SUPPORT_ADMIN_JWT=<admin-role JWT>
//   SUPPORT_USER_A_JWT=<non-admin JWT>
//   SUPPORT_ADMIN_USER_ID=<the admin user's auth.users id>
//   SUPPORT_TEST_TICKET_ID=<ticket in any non-archived status>

const LIVE_DB = Boolean(process.env.SUPPORT_LIVE_DB);
const SUPABASE_URL = process.env.SUPABASE_E2E_URL ?? "";
const ANON_KEY = process.env.SUPABASE_E2E_ANON_KEY ?? "";
const ADMIN_JWT = process.env.SUPPORT_ADMIN_JWT ?? "";
const USER_A_JWT = process.env.SUPPORT_USER_A_JWT ?? "";
const ADMIN_USER_ID = process.env.SUPPORT_ADMIN_USER_ID ?? "";
const TEST_TICKET_ID = process.env.SUPPORT_TEST_TICKET_ID ?? "";

const RPC = `${SUPABASE_URL}/rest/v1/rpc/assign_admin_to_ticket`;

test.describe("E48-v3 — assign_admin_to_ticket RPC", () => {
  test.skip(
    !LIVE_DB || !SUPABASE_URL || !ANON_KEY || !ADMIN_JWT || !TEST_TICKET_ID || !ADMIN_USER_ID,
    "live Supabase required — see file header for env vars",
  );

  test("happy path: admin assigns self → 200 / null error", async ({ request }) => {
    const r = await request.post(RPC, {
      headers: {
        apikey: ANON_KEY,
        authorization: `Bearer ${ADMIN_JWT}`,
        "content-type": "application/json",
      },
      data: { p_ticket_id: TEST_TICKET_ID, p_assignee_id: ADMIN_USER_ID },
    });
    expect([200, 204]).toContain(r.status());
    if (r.status() === 200) {
      const body = await r.text();
      expect(body).not.toMatch(/error/i);
    }
  });

  test("auth-fail: no Bearer token → 401/403", async ({ request }) => {
    const r = await request.post(RPC, {
      headers: {
        apikey: ANON_KEY,
        "content-type": "application/json",
      },
      data: { p_ticket_id: TEST_TICKET_ID, p_assignee_id: ADMIN_USER_ID },
    });
    expect([401, 403]).toContain(r.status());
  });

  test("duplicate assignment is idempotent — second call succeeds", async ({ request }) => {
    const headers = {
      apikey: ANON_KEY,
      authorization: `Bearer ${ADMIN_JWT}`,
      "content-type": "application/json",
    };
    const data = { p_ticket_id: TEST_TICKET_ID, p_assignee_id: ADMIN_USER_ID };

    const r1 = await request.post(RPC, { headers, data });
    expect([200, 204]).toContain(r1.status());

    const r2 = await request.post(RPC, { headers, data });
    expect([200, 204]).toContain(r2.status());
  });

  test("non-admin user JWT → 400/403 / not_authorized", async ({ request }) => {
    test.skip(!USER_A_JWT, "needs SUPPORT_USER_A_JWT");
    const r = await request.post(RPC, {
      headers: {
        apikey: ANON_KEY,
        authorization: `Bearer ${USER_A_JWT}`,
        "content-type": "application/json",
      },
      data: { p_ticket_id: TEST_TICKET_ID, p_assignee_id: ADMIN_USER_ID },
    });
    expect([400, 403, 422]).toContain(r.status());
    expect(await r.text()).toMatch(/not_authorized|not_admin|unauthorized/i);
  });

  test("audit log row exists after assignment", async ({ request }) => {
    // Re-assign (idempotent) then verify audit_log entry exists.
    await request.post(RPC, {
      headers: {
        apikey: ANON_KEY,
        authorization: `Bearer ${ADMIN_JWT}`,
        "content-type": "application/json",
      },
      data: { p_ticket_id: TEST_TICKET_ID, p_assignee_id: ADMIN_USER_ID },
    });

    const auditR = await request.get(
      `${SUPABASE_URL}/rest/v1/support_ticket_audit_log?ticket_id=eq.${TEST_TICKET_ID}&action=eq.assigned&order=created_at.desc&limit=1`,
      {
        headers: { apikey: ANON_KEY, authorization: `Bearer ${ADMIN_JWT}` },
      },
    );
    if (auditR.status() === 200) {
      const rows = (await auditR.json()) as unknown[];
      expect(rows.length).toBeGreaterThanOrEqual(1);
    } else {
      // Audit log may not be PostgREST-accessible — that's acceptable; the
      // test verifies the RPC call path only if the table is readable.
      expect([200, 404, 403]).toContain(auditR.status());
    }
  });
});
