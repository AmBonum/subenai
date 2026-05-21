import { test, expect } from "@playwright/test";

// E48 security — view_token edge cases (TC-09..TC-11, TC-18..TC-22).
//
// The view_token is a 64-hex secret bound to a single ticket via a
// SHA-256 hash column. The RPC `get_ticket_thread_for_view_token` is
// the only path the anonymous submitter has to read their own ticket.
// These tests verify the boundary properties: expiry, invalidation,
// hash mismatch, ticket-id binding.
//
// All of these need live Supabase to exercise the RPC + RLS shape.
// Without SUPPORT_LIVE_DB they no-op. The seeding contract is documented
// inline at each test — to run locally:
//
//   1. Apply 20260521260000_e48_1_support_tickets_schema.sql
//   2. Seed a ticket via service-role
//   3. Export SUPPORT_LIVE_DB=1, SUPABASE_E2E_URL, SUPABASE_E2E_ANON_KEY,
//      and SUPPORT_TICKET_ID + SUPPORT_VIEW_TOKEN for the seeded row.
//
// SQL helpers for re-seeding are in supabase/scripts/seed-e48-tickets.sql
// (created in PR #B).

const LIVE_DB = Boolean(process.env.SUPPORT_LIVE_DB);
const SUPABASE_URL = process.env.SUPABASE_E2E_URL ?? "";
const ANON_KEY = process.env.SUPABASE_E2E_ANON_KEY ?? "";
const TICKET_ID = process.env.SUPPORT_TICKET_ID ?? "";
const VIEW_TOKEN = process.env.SUPPORT_VIEW_TOKEN ?? "";

const RPC_PATH = "/rest/v1/rpc/get_ticket_thread_for_view_token";

function rpc(args: { p_ticket_id: string | null; p_view_token: string | null }) {
  return {
    p_ticket_id: args.p_ticket_id,
    p_view_token: args.p_view_token,
    p_metadata: null,
  };
}

test.describe("E48 security — view-token RPC information-disclosure boundary", () => {
  test.skip(
    !LIVE_DB || !SUPABASE_URL || !ANON_KEY || !TICKET_ID || !VIEW_TOKEN,
    "live Supabase required — see file header",
  );

  test("TC-09: expired view token → upload returns 403 not_authorized", async ({ request }) => {
    test.skip(
      !process.env.SUPPORT_EXPIRED_TICKET_ID || !process.env.SUPPORT_EXPIRED_VIEW_TOKEN,
      "needs SUPPORT_EXPIRED_TICKET_ID + SUPPORT_EXPIRED_VIEW_TOKEN (seed a ticket then UPDATE view_token_expires_at = now() - interval '1 sec')",
    );
    const fd = new FormData();
    // 1x1 transparent PNG.
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=",
      "base64",
    );
    fd.append("file", new Blob([png], { type: "image/png" }), "ok.png");
    fd.append("ticket_id", process.env.SUPPORT_EXPIRED_TICKET_ID!);
    fd.append("view_token", process.env.SUPPORT_EXPIRED_VIEW_TOKEN!);
    const r = await request.post("/api/support-attachment-upload", {
      multipart: {
        file: { name: "ok.png", mimeType: "image/png", buffer: png },
        ticket_id: process.env.SUPPORT_EXPIRED_TICKET_ID!,
        view_token: process.env.SUPPORT_EXPIRED_VIEW_TOKEN!,
      },
    });
    expect(r.status()).toBe(403);
    expect((await r.json()).error).toBe("not_authorized");
  });

  test("TC-10: revoked view token → upload returns 403 not_authorized", async ({ request }) => {
    test.skip(
      !process.env.SUPPORT_REVOKED_TICKET_ID || !process.env.SUPPORT_REVOKED_VIEW_TOKEN,
      "needs SUPPORT_REVOKED_TICKET_ID + SUPPORT_REVOKED_VIEW_TOKEN (seed, then UPDATE view_token_invalidated_at = now())",
    );
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=",
      "base64",
    );
    const r = await request.post("/api/support-attachment-upload", {
      multipart: {
        file: { name: "ok.png", mimeType: "image/png", buffer: png },
        ticket_id: process.env.SUPPORT_REVOKED_TICKET_ID!,
        view_token: process.env.SUPPORT_REVOKED_VIEW_TOKEN!,
      },
    });
    expect(r.status()).toBe(403);
    expect((await r.json()).error).toBe("not_authorized");
  });

  test("TC-11: RPC with NULL token returns null (not the ticket)", async ({ request }) => {
    const r = await request.post(`${SUPABASE_URL}${RPC_PATH}`, {
      headers: { apikey: ANON_KEY, "content-type": "application/json" },
      data: rpc({ p_ticket_id: TICKET_ID, p_view_token: null }),
    });
    expect(r.status()).toBe(200);
    expect(await r.json()).toBeNull();
  });

  test("TC-18: all-zero token does not match any stored hash", async ({ request }) => {
    const zero = "0".repeat(64);
    const r = await request.post(`${SUPABASE_URL}${RPC_PATH}`, {
      headers: { apikey: ANON_KEY, "content-type": "application/json" },
      data: rpc({ p_ticket_id: TICKET_ID, p_view_token: zero }),
    });
    expect(r.status()).toBe(200);
    expect(await r.json()).toBeNull();
  });

  test("TC-19: one-character-off token (Hamming distance 1) is rejected", async ({ request }) => {
    // Flip the first hex char. 'a'<->'b' gives a distance-1 mutation
    // while preserving the regex shape [0-9a-f]{64}.
    const swap = VIEW_TOKEN[0] === "a" ? "b" : "a";
    const mutated = swap + VIEW_TOKEN.slice(1);
    expect(mutated).not.toEqual(VIEW_TOKEN);
    const r = await request.post(`${SUPABASE_URL}${RPC_PATH}`, {
      headers: { apikey: ANON_KEY, "content-type": "application/json" },
      data: rpc({ p_ticket_id: TICKET_ID, p_view_token: mutated }),
    });
    expect(r.status()).toBe(200);
    expect(await r.json()).toBeNull();
  });

  test("TC-20: expired view_token_expires_at returns null from the RPC", async ({ request }) => {
    test.skip(
      !process.env.SUPPORT_EXPIRED_TICKET_ID || !process.env.SUPPORT_EXPIRED_VIEW_TOKEN,
      "needs SUPPORT_EXPIRED_TICKET_ID + SUPPORT_EXPIRED_VIEW_TOKEN",
    );
    const r = await request.post(`${SUPABASE_URL}${RPC_PATH}`, {
      headers: { apikey: ANON_KEY, "content-type": "application/json" },
      data: rpc({
        p_ticket_id: process.env.SUPPORT_EXPIRED_TICKET_ID!,
        p_view_token: process.env.SUPPORT_EXPIRED_VIEW_TOKEN!,
      }),
    });
    expect(r.status()).toBe(200);
    expect(await r.json()).toBeNull();
  });

  test("TC-21: invalidated_at set → RPC returns null even for the correct token", async ({
    request,
  }) => {
    test.skip(
      !process.env.SUPPORT_REVOKED_TICKET_ID || !process.env.SUPPORT_REVOKED_VIEW_TOKEN,
      "needs SUPPORT_REVOKED_TICKET_ID + SUPPORT_REVOKED_VIEW_TOKEN",
    );
    const r = await request.post(`${SUPABASE_URL}${RPC_PATH}`, {
      headers: { apikey: ANON_KEY, "content-type": "application/json" },
      data: rpc({
        p_ticket_id: process.env.SUPPORT_REVOKED_TICKET_ID!,
        p_view_token: process.env.SUPPORT_REVOKED_VIEW_TOKEN!,
      }),
    });
    expect(r.status()).toBe(200);
    expect(await r.json()).toBeNull();
  });

  test("TC-22: valid token for ticket A cannot be used with ticket B", async ({ request }) => {
    test.skip(
      !process.env.SUPPORT_TICKET_B_ID,
      "needs SUPPORT_TICKET_B_ID (a second ticket with its own distinct view_token_hash)",
    );
    const r = await request.post(`${SUPABASE_URL}${RPC_PATH}`, {
      headers: { apikey: ANON_KEY, "content-type": "application/json" },
      data: rpc({
        p_ticket_id: process.env.SUPPORT_TICKET_B_ID!,
        p_view_token: VIEW_TOKEN,
      }),
    });
    expect(r.status()).toBe(200);
    expect(await r.json()).toBeNull();
  });
});
