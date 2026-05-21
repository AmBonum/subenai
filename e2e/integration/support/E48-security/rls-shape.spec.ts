import { test, expect } from "@playwright/test";

// E48 security — RLS shape verification via direct PostgREST calls.
// Traces TC-12, TC-13, TC-14, TC-15, TC-16, TC-41, TC-42, TC-43, TC-45,
// TC-48 from specs/support/E48-security.md.
//
// Why direct PostgREST? Because the goal is to prove the policies on
// support_tickets, support_ticket_messages, support_ticket_attachments
// are RLS-tight regardless of the application layer. If we tested via
// the CF function we'd be measuring the function's auth check, not the
// DB's. Both layers matter — this file is the DB layer.
//
// Operator setup (local-only):
//   export SUPPORT_LIVE_DB=1
//   export SUPABASE_E2E_URL=https://<project>.supabase.co
//   export SUPABASE_E2E_ANON_KEY=<anon key>
//   export SUPABASE_E2E_SERVICE_ROLE_KEY=<service role>   # for seeding
//   export SUPPORT_USER_A_JWT=<JWT for an authenticated user who owns a ticket>
//   export SUPPORT_USER_B_JWT=<JWT for a different non-admin user>
//   export SUPPORT_USER_A_TICKET_ID=<the ticket owned by user A>
//   export SUPPORT_ATTACHMENT_CLEAN_ID=<UUID of an attachment with scan_status='clean'>
//
// Without those env vars every test in the file skips (no-op in CI).

const LIVE_DB = Boolean(process.env.SUPPORT_LIVE_DB);
const SUPABASE_URL = process.env.SUPABASE_E2E_URL ?? "";
const ANON_KEY = process.env.SUPABASE_E2E_ANON_KEY ?? "";

const USER_A_JWT = process.env.SUPPORT_USER_A_JWT ?? "";
const USER_B_JWT = process.env.SUPPORT_USER_B_JWT ?? "";
const USER_A_TICKET_ID = process.env.SUPPORT_USER_A_TICKET_ID ?? "";
const ATTACHMENT_CLEAN_ID = process.env.SUPPORT_ATTACHMENT_CLEAN_ID ?? "";

test.describe("E48 security — RLS shape on support_tickets (anon)", () => {
  test.skip(!LIVE_DB || !SUPABASE_URL || !ANON_KEY, "live Supabase required — see file header");

  test("TC-12: anon role cannot SELECT support_tickets via PostgREST", async ({ request }) => {
    const r = await request.get(`${SUPABASE_URL}/rest/v1/support_tickets?select=id`, {
      headers: { apikey: ANON_KEY },
    });
    // Either policy returns an empty array (RLS deny-all) or 401 (REVOKE
    // ALL from anon). Both satisfy the information-disclosure boundary.
    if (r.status() === 200) {
      expect(await r.json()).toEqual([]);
    } else {
      expect([401, 403]).toContain(r.status());
    }
  });

  test("TC-13: anon role cannot INSERT into support_tickets via PostgREST", async ({ request }) => {
    const r = await request.post(`${SUPABASE_URL}/rest/v1/support_tickets`, {
      headers: { apikey: ANON_KEY, "content-type": "application/json" },
      data: {
        subject: "anon insert attempt",
        body: "body content here for the test case",
        submitter_email: "anon-attempt@test.example",
        category: "question",
      },
    });
    expect([401, 403]).toContain(r.status());
  });

  test("TC-41: submit_support_ticket RPC called with anon key alone is rejected", async ({
    request,
  }) => {
    const r = await request.post(`${SUPABASE_URL}/rest/v1/rpc/submit_support_ticket`, {
      headers: { apikey: ANON_KEY, "content-type": "application/json" },
      data: {
        p_payload: {
          subject: "anon RPC attempt",
          body: "body content here for the test case",
          submitter_email: "anon-rpc@test.example",
          category: "question",
        },
      },
    });
    // Function is marked SECURITY DEFINER with an explicit role-check
    // guard. Either 403 or a PostgreSQL exception with 'unauthorized_role'.
    if (r.status() === 200) {
      const body = await r.json();
      expect(String(body?.message ?? "")).toMatch(/unauthorized_role|not_authorized/i);
    } else {
      expect([401, 403, 400]).toContain(r.status());
    }
  });
});

test.describe("E48 security — RLS shape across non-admin authenticated users", () => {
  test.skip(
    !LIVE_DB || !SUPABASE_URL || !ANON_KEY || !USER_A_JWT || !USER_B_JWT || !USER_A_TICKET_ID,
    "needs SUPPORT_USER_{A,B}_JWT + SUPPORT_USER_A_TICKET_ID",
  );

  test("TC-14: user B cannot read user A's ticket via PostgREST", async ({ request }) => {
    const r = await request.get(`${SUPABASE_URL}/rest/v1/support_tickets?select=id`, {
      headers: { apikey: ANON_KEY, authorization: `Bearer ${USER_B_JWT}` },
    });
    expect(r.status()).toBe(200);
    const rows = (await r.json()) as Array<{ id: string }>;
    expect(rows.find((row) => row.id === USER_A_TICKET_ID)).toBeUndefined();
  });

  test("TC-15: user A (the submitter) cannot UPDATE status via PostgREST", async ({ request }) => {
    const r = await request.patch(
      `${SUPABASE_URL}/rest/v1/support_tickets?id=eq.${USER_A_TICKET_ID}`,
      {
        headers: {
          apikey: ANON_KEY,
          authorization: `Bearer ${USER_A_JWT}`,
          "content-type": "application/json",
          prefer: "return=representation",
        },
        data: { status: "resolved" },
      },
    );
    // Either the UPDATE policy filters status out (400/403) or the
    // immutability trigger throws. Either way: not 200 + row mutated.
    expect([400, 403]).toContain(r.status());
  });

  test("TC-42: immutability trigger blocks subject UPDATE by the submitter", async ({
    request,
  }) => {
    const r = await request.patch(
      `${SUPABASE_URL}/rest/v1/support_tickets?id=eq.${USER_A_TICKET_ID}`,
      {
        headers: {
          apikey: ANON_KEY,
          authorization: `Bearer ${USER_A_JWT}`,
          "content-type": "application/json",
          prefer: "return=representation",
        },
        data: { subject: "TAMPERED" },
      },
    );
    expect([400, 403]).toContain(r.status());
    const body = await r.text();
    // BEFORE UPDATE trigger raises with this error code per migration.
    expect(body).toMatch(/immutable_field_changed|not_allowed/i);
  });

  test("TC-43: non-owner uploading to ticket via /api/support-attachment-upload → 403", async ({
    request,
  }) => {
    // This hits the CF function (not PostgREST). The function-side ACL
    // matches the RLS shape — owner-only paths.
    test.use({ baseURL: process.env.BASE_URL ?? "http://localhost:8788" });
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=",
      "base64",
    );
    const r = await request.post("/api/support-attachment-upload", {
      headers: { authorization: `Bearer ${USER_B_JWT}` },
      multipart: {
        file: { name: "x.png", mimeType: "image/png", buffer: png },
        ticket_id: USER_A_TICKET_ID,
      },
    });
    expect(r.status()).toBe(403);
    expect((await r.json()).error).toBe("not_authorized");
  });
});

test.describe("E48 security — request_attachment_signed_url RPC guard", () => {
  test.skip(
    !LIVE_DB || !SUPABASE_URL || !ANON_KEY || !USER_B_JWT || !ATTACHMENT_CLEAN_ID,
    "needs SUPPORT_USER_B_JWT + SUPPORT_ATTACHMENT_CLEAN_ID",
  );

  test("TC-16: non-admin authenticated caller is rejected with not_authorized", async ({
    request,
  }) => {
    const r = await request.post(`${SUPABASE_URL}/rest/v1/rpc/request_attachment_signed_url`, {
      headers: {
        apikey: ANON_KEY,
        authorization: `Bearer ${USER_B_JWT}`,
        "content-type": "application/json",
      },
      data: { p_attachment_id: ATTACHMENT_CLEAN_ID },
    });
    expect([400, 403]).toContain(r.status());
    expect(await r.text()).toMatch(/not_authorized/i);
  });

  test("TC-44: error-status attachment → RPC returns null / raises not_clean", async ({
    request,
  }) => {
    test.skip(
      !process.env.SUPPORT_ADMIN_JWT || !process.env.SUPPORT_ATTACHMENT_ERROR_ID,
      "needs SUPPORT_ADMIN_JWT + SUPPORT_ATTACHMENT_ERROR_ID (an attachment row with scan_status='error')",
    );
    const r = await request.post(`${SUPABASE_URL}/rest/v1/rpc/request_attachment_signed_url`, {
      headers: {
        apikey: ANON_KEY,
        authorization: `Bearer ${process.env.SUPPORT_ADMIN_JWT}`,
        "content-type": "application/json",
      },
      data: { p_attachment_id: process.env.SUPPORT_ATTACHMENT_ERROR_ID! },
    });
    expect([200, 400, 403]).toContain(r.status());
    expect(await r.text()).toMatch(/not_clean|null/i);
  });
});

test.describe("E48 security — storage bucket + CHECK constraint hardening", () => {
  test.skip(!LIVE_DB || !SUPABASE_URL || !ANON_KEY, "live Supabase required");

  test("TC-45: storage bucket direct URL with anon key only → 400/403", async ({ request }) => {
    test.skip(
      !process.env.SUPPORT_ATTACHMENT_STORAGE_PATH,
      "needs SUPPORT_ATTACHMENT_STORAGE_PATH (e.g. <ticket_id>/<uuid>.png from a real attachment)",
    );
    const r = await request.get(
      `${SUPABASE_URL}/storage/v1/object/support-attachments/${process.env.SUPPORT_ATTACHMENT_STORAGE_PATH}`,
      { headers: { apikey: ANON_KEY } },
    );
    expect([400, 401, 403, 404]).toContain(r.status());
  });

  test("TC-48: view_token_hash CHECK constraint rejects a non-64-hex value", async ({
    request,
  }) => {
    test.skip(
      !process.env.SUPABASE_E2E_SERVICE_ROLE_KEY,
      "needs SUPABASE_E2E_SERVICE_ROLE_KEY (bypassing RLS to test the CHECK at the DB layer)",
    );
    const r = await request.post(`${SUPABASE_URL}/rest/v1/support_tickets`, {
      headers: {
        apikey: process.env.SUPABASE_E2E_SERVICE_ROLE_KEY!,
        authorization: `Bearer ${process.env.SUPABASE_E2E_SERVICE_ROLE_KEY!}`,
        "content-type": "application/json",
      },
      data: {
        subject: "TC-48 check constraint",
        body: "body content for the constraint test",
        submitter_email: "tc48@test.example",
        category: "question",
        view_token_hash: "not-a-hash",
      },
    });
    expect([400, 422]).toContain(r.status());
    expect(await r.text()).toMatch(/check|view_token_hash|constraint/i);
  });
});

test.describe("E48 security — FSM transition guard", () => {
  test.skip(
    !LIVE_DB || !SUPABASE_URL || !ANON_KEY || !process.env.SUPPORT_ADMIN_JWT,
    "needs SUPPORT_ADMIN_JWT + a ticket in status='new'",
  );

  test("TC-46: transition_ticket_status rejects illegal new → resolved", async ({ request }) => {
    test.skip(
      !process.env.SUPPORT_NEW_TICKET_ID,
      "needs SUPPORT_NEW_TICKET_ID (a ticket with status='new')",
    );
    const r = await request.post(`${SUPABASE_URL}/rest/v1/rpc/transition_ticket_status`, {
      headers: {
        apikey: ANON_KEY,
        authorization: `Bearer ${process.env.SUPPORT_ADMIN_JWT}`,
        "content-type": "application/json",
      },
      data: {
        p_ticket_id: process.env.SUPPORT_NEW_TICKET_ID!,
        p_new_status: "resolved",
        p_reason: null,
      },
    });
    expect([400, 403, 422]).toContain(r.status());
    expect(await r.text()).toMatch(/invalid_transition/i);
  });
});
