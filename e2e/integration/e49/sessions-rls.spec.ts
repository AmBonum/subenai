/**
 * E49 Phase 1c-2 — RLS contract for sessions / tests as seen via the
 * authenticated PostgREST surface.
 *
 * Covers NEG-02 (foreign test read returns empty), SEC-19 (IDOR direct
 * GET on a foreign session is blocked), and two positive RLS round-trips
 * that the mock can't model (owner CAN read; owner CAN list answers).
 */

import { test, expect } from "@playwright/test";

import {
  E49_FOREIGN_SESSION,
  E49_QUESTIONS,
  E49_SESSIONS,
  E49_TESTS,
  E49_TEST_FOREIGN,
  E49_TEST_TYPICAL,
} from "../../fixtures/e49-fixtures";
import { mintLiveAccessToken, readLiveState } from "../../fixtures/live-auth";

const state = readLiveState();
const liveOk = !!state && !!state.supabaseUrl;

test.describe("E49 sessions RLS — live-Supabase", () => {
  test.skip(!liveOk, "E49 live-supabase not available");

  function restHeaders(jwt: string): Record<string, string> {
    return {
      apikey: state!.anonKey,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    };
  }

  test("NEG-02 — TU-A reading TU-B's test row returns zero rows (RLS)", async ({ request }) => {
    const token = await mintLiveAccessToken(request, "educatorA", state!);
    const res = await request.get(
      `${state!.supabaseUrl}/rest/v1/tests?id=eq.${E49_TEST_FOREIGN}&select=id,owner_id`,
      { headers: restHeaders(token.access_token) },
    );
    expect(res.status()).toBe(200);
    const rows = (await res.json()) as unknown[];
    expect(rows).toEqual([]);
  });

  test("SEC-19 — TU-A direct GET on TU-B's session returns zero rows (RLS)", async ({
    request,
  }) => {
    const token = await mintLiveAccessToken(request, "educatorA", state!);
    const res = await request.get(
      `${state!.supabaseUrl}/rest/v1/sessions?id=eq.${E49_FOREIGN_SESSION}&select=id,test_id`,
      { headers: restHeaders(token.access_token) },
    );
    expect(res.status()).toBe(200);
    const rows = (await res.json()) as unknown[];
    expect(rows).toEqual([]);
  });

  test("POS — TU-A can read own test row + sessions count", async ({ request }) => {
    const token = await mintLiveAccessToken(request, "educatorA", state!);
    const testRes = await request.get(
      `${state!.supabaseUrl}/rest/v1/tests?id=eq.${E49_TEST_TYPICAL}&select=id,owner_id`,
      { headers: restHeaders(token.access_token) },
    );
    expect(testRes.status()).toBe(200);
    const testRows = (await testRes.json()) as Array<{ id: string }>;
    expect(testRows).toHaveLength(1);

    const sessRes = await request.get(
      `${state!.supabaseUrl}/rest/v1/sessions?test_id=eq.${E49_TEST_TYPICAL}&select=id`,
      { headers: { ...restHeaders(token.access_token), Prefer: "count=exact" } },
    );
    expect(sessRes.status()).toBe(200);
    const sessRows = (await sessRes.json()) as unknown[];
    expect(sessRows.length).toBeGreaterThanOrEqual(5);
  });

  test("POS — TU-A can join session_answers for an owned session", async ({ request }) => {
    const token = await mintLiveAccessToken(request, "educatorA", state!);
    const res = await request.get(
      `${state!.supabaseUrl}/rest/v1/session_answers?session_id=eq.${E49_SESSIONS.typicalCompletedNamed}&select=question_id,is_correct,value`,
      { headers: restHeaders(token.access_token) },
    );
    expect(res.status()).toBe(200);
    const rows = (await res.json()) as Array<{ question_id: string }>;
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const qids = new Set(rows.map((r) => r.question_id));
    expect(qids.has(E49_QUESTIONS.q001ArrayCorrect)).toBe(true);
    expect(E49_TESTS.typicalPublished).toBeDefined();
  });
});
