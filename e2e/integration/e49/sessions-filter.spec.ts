/**
 * E49 Phase 1c-2 — real PostgREST `or()` + JSON-path ilike filters.
 *
 * Covers POS-11 (name search), POS-12 (email JSON-path), POS-13
 * (case-insensitive). The mock supabase parser can't model these
 * accurately; this spec exercises the real PostgREST surface.
 */

import { test, expect } from "@playwright/test";

import { E49_TEST_TYPICAL } from "../../fixtures/e49-fixtures";
import { mintLiveAccessToken, readLiveState } from "../../fixtures/live-auth";

const state = readLiveState();
const liveOk = !!state && !!state.supabaseUrl;

interface SessionRow {
  id: string;
  intake_data: { name?: string; email?: string } | null;
}

test.describe("E49 sessions filter — live-Supabase", () => {
  test.skip(!liveOk, "E49 live-supabase not available");

  function restHeaders(jwt: string): Record<string, string> {
    return {
      apikey: state!.anonKey,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    };
  }

  test("POS-11 — `or()` search by name 'Jana' returns the named-completed row", async ({
    request,
  }) => {
    const token = await mintLiveAccessToken(request, "educatorA", state!);
    const orExpr = "intake_data->>name.ilike.*Jana*,intake_data->>email.ilike.*Jana*";
    const res = await request.get(
      `${state!.supabaseUrl}/rest/v1/sessions?test_id=eq.${E49_TEST_TYPICAL}&or=(${encodeURIComponent(orExpr)})&select=id,intake_data`,
      { headers: restHeaders(token.access_token) },
    );
    expect(res.status()).toBe(200);
    const rows = (await res.json()) as SessionRow[];
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.some((r) => (r.intake_data?.name ?? "").includes("Jana"))).toBe(true);
  });

  test("POS-12 — JSON-path ilike on intake_data->>email matches @example.com rows", async ({
    request,
  }) => {
    const token = await mintLiveAccessToken(request, "educatorA", state!);
    const res = await request.get(
      `${state!.supabaseUrl}/rest/v1/sessions?test_id=eq.${E49_TEST_TYPICAL}&intake_data->>email=ilike.*example.com*&select=id,intake_data`,
      { headers: restHeaders(token.access_token) },
    );
    expect(res.status()).toBe(200);
    const rows = (await res.json()) as SessionRow[];
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const r of rows) {
      expect((r.intake_data?.email ?? "").toLowerCase()).toContain("example.com");
    }
  });

  test("POS-13 — case-insensitive 'JANA' matches 'Jana Nováková'", async ({ request }) => {
    const token = await mintLiveAccessToken(request, "educatorA", state!);
    const orExpr = "intake_data->>name.ilike.*JANA*,intake_data->>email.ilike.*JANA*";
    const res = await request.get(
      `${state!.supabaseUrl}/rest/v1/sessions?test_id=eq.${E49_TEST_TYPICAL}&or=(${encodeURIComponent(orExpr)})&select=id,intake_data`,
      { headers: restHeaders(token.access_token) },
    );
    expect(res.status()).toBe(200);
    const rows = (await res.json()) as SessionRow[];
    expect(rows.some((r) => (r.intake_data?.name ?? "").includes("Jana"))).toBe(true);
  });
});
