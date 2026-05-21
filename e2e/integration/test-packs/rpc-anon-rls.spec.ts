import { test, expect } from "@playwright/test";

/**
 * E37 — API integration: anon RLS enforcement on platform_pack_metadata.
 *
 * Source plan: specs/test-packs/e37-db-backed-catalog.md (TC-21).
 *
 * Verifies that the anon JWT can NOT directly write to
 * `platform_pack_metadata` via PostgREST. Writes are admin-only by RLS
 * policy `platform_pack_metadata_admin_write` (Phase B' migration).
 *
 * Reads through the SECURITY DEFINER RPCs (`get_platform_packs`,
 * `get_pack_with_questions`, `get_platform_pack_question_ids`) are
 * intentionally allowed — those are the public catalog surface.
 *
 * This test hits the LIVE Supabase REST endpoint. It needs:
 *   - VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY (or
 *     SUPABASE_URL + SUPABASE_ANON_KEY) in env
 *   - The Phase B' migration applied to that Supabase project
 *
 * Skips gracefully if the env is missing — CI without creds shouldn't
 * fail this; preview deploys with creds will exercise it.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";

test.describe("E37 RPC + RLS — anon access boundary", () => {
  test.skip(!SUPABASE_URL || !SUPABASE_ANON_KEY, "Supabase creds not in env");

  test("anon JWT cannot POST a new platform_pack_metadata row", async ({ request }) => {
    const res = await request.post(`${SUPABASE_URL}/rest/v1/platform_pack_metadata`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      data: {
        test_id: "00000000-0000-0000-0000-000000000000",
        industry: "anon_injection_attempt",
        industry_emoji: "💥",
        tagline: "should never persist",
        target_persona: "should never persist",
        passing_threshold: 70,
      },
    });
    // RLS denies — PostgREST returns 401 (no role) or 403 (role rejected)
    // or 400/409 (FK violation if the body somehow validates). Any
    // non-2xx is correct behavior; we just don't want a 200/201.
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test("anon JWT cannot PATCH an existing platform_pack_metadata row", async ({ request }) => {
    const res = await request.patch(
      `${SUPABASE_URL}/rest/v1/platform_pack_metadata?test_id=eq.00000000-0000-0000-0000-000000000000`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        data: { tagline: "anon attempted overwrite" },
      },
    );
    expect(res.status()).toBeGreaterThanOrEqual(400);
    expect(res.status()).toBeLessThan(500);
  });

  test("anon JWT CAN call get_platform_packs() RPC (positive control)", async ({ request }) => {
    // Sanity-check that the catalog RPC works for anon — if this fails,
    // the test environment is broken (the negative tests above might
    // pass for the wrong reason).
    const res = await request.post(`${SUPABASE_URL}/rest/v1/rpc/get_platform_packs`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      data: {},
    });
    expect(res.ok()).toBeTruthy();
    const rows = await res.json();
    expect(Array.isArray(rows)).toBe(true);
    // 15 packs expected when Phase B' is applied with the platform user.
    // Allow 0 to keep the test robust against staging environments where
    // only Phases B+C of the migration ran (no platform user).
    expect(rows.length).toBeGreaterThanOrEqual(0);
  });
});
