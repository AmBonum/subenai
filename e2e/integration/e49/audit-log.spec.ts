/**
 * E49 Phase 1c-2 — audit_log writes for CSV export.
 *
 * Covers:
 *   - POS (audit row written on success): exactly 1 row with
 *     action='test.export_csv', target_id=<test>, pii_access=true.
 *   - NEG-20: rate-limited request writes ZERO audit rows.
 */

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { E49_TESTS, E49_USERS } from "../../fixtures/e49-fixtures";
import { mintLiveAccessToken, readLiveState } from "../../fixtures/live-auth";

const state = readLiveState();
const liveOk = !!state && !!state.supabaseUrl;

test.describe("E49 CSV export — audit_log contract", () => {
  test.skip(!liveOk, "E49 live-supabase not available");

  async function clearAuditForActor(actorId: string): Promise<void> {
    const client = createClient(state!.supabaseUrl, state!.serviceRoleKey);
    await client.from("audit_log").delete().eq("actor_id", actorId).eq("action", "test.export_csv");
  }

  test("POS — successful export writes exactly 1 audit row with pii_access=true", async ({
    request,
  }) => {
    const actorId = E49_USERS.educatorA.id;
    await clearAuditForActor(actorId);

    const token = await mintLiveAccessToken(request, "educatorA", state!);
    const res = await request.get(
      `${state!.cfApiBaseUrl}/api/tests/export-sessions?testId=${E49_TESTS.typicalPublished}`,
      {
        headers: {
          authorization: `Bearer ${token.access_token}`,
          origin: state!.previewBaseUrl,
          "x-forwarded-for": "10.0.0.100",
        },
      },
    );
    expect(res.status()).toBe(200);

    const client = createClient(state!.supabaseUrl, state!.serviceRoleKey);
    const { data, error } = await client
      .from("audit_log")
      .select("actor_id, action, target_id, target_type, pii_access")
      .eq("actor_id", actorId)
      .eq("action", "test.export_csv");
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0]).toMatchObject({
      action: "test.export_csv",
      target_type: "test",
      target_id: E49_TESTS.typicalPublished,
      pii_access: true,
    });
  });

  test("NEG-20 — rate-limited request does NOT write an audit row", async ({ request }) => {
    const actorId = E49_USERS.educatorB.id;
    await clearAuditForActor(actorId);

    const token = await mintLiveAccessToken(request, "educatorB", state!);
    const cap = Number.parseInt(state!.rateLimitAuthor, 10);
    const baseHeaders = {
      authorization: `Bearer ${token.access_token}`,
      origin: state!.previewBaseUrl,
      "x-forwarded-for": "10.0.0.120",
    };
    // We need an owned test for TU-B to *succeed* up to cap, then exhaust.
    // TU-B owns `foreignPublished` / `foreignWithSessions`. Use a unique
    // IP so we don't collide with the per-IP cap.
    for (let i = 0; i < cap; i++) {
      const r = await request.get(
        `${state!.cfApiBaseUrl}/api/tests/export-sessions?testId=${E49_TESTS.foreignPublished}`,
        { headers: baseHeaders },
      );
      expect(r.status()).toBe(200);
    }
    const limited = await request.get(
      `${state!.cfApiBaseUrl}/api/tests/export-sessions?testId=${E49_TESTS.foreignPublished}`,
      { headers: baseHeaders },
    );
    expect(limited.status()).toBe(429);

    const client = createClient(state!.supabaseUrl, state!.serviceRoleKey);
    const { data, error } = await client
      .from("audit_log")
      .select("id, action")
      .eq("actor_id", actorId)
      .eq("action", "test.export_csv");
    expect(error).toBeNull();
    // Exactly `cap` audit rows — one per success, zero from the 429.
    expect(data?.length ?? 0).toBe(cap);
  });
});
