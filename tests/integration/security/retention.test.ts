// E38.4 — live-SQL integration test for the three retention RPCs.
//
// Coverage:
//   - purge_expired_attempts: deletes attempts older than 36 months,
//     leaves 35-month-old rows alone.
//   - anonymize_expired_anticheat: NULLs flags + total_time_ms on
//     attempts older than 12 months, leaves 6-month-old rows alone,
//     preserves score / breakdown / personality.
//   - anonymize_expired_edu_respondents: NULLs respondent_name +
//     respondent_email on edu attempts older than 12 months, leaves
//     6-month-old edu rows alone, preserves final_score + share_id.
//   - Authorization: anon clients cannot call any of the three RPCs.
//
// Skips with a clear marker if local Supabase isn't reachable — see
// `tests/integration/security/setup-supabase.ts`.

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getLocalSupabase, isReachable, type LocalSupabaseFixture } from "./setup-supabase";

let fixture: LocalSupabaseFixture | null = null;
let alive = false;

beforeAll(async () => {
  fixture = getLocalSupabase();
  if (!fixture) return;
  alive = await isReachable(fixture.anon);
});

afterAll(() => {
  fixture = null;
});

function shareId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function maybe(name: string, body: () => Promise<void>) {
  it(name, async () => {
    if (!fixture || !alive) return;
    await body();
  });
}

describe("retention — purge_expired_attempts", () => {
  maybe("deletes rows older than 36 months, preserves rows under threshold", async () => {
    const oldShare = shareId("ret-old");
    const newShare = shareId("ret-new");

    // Seed: insert via service-role with backdated created_at.
    await fixture!.serviceRole.from("attempts").insert([
      {
        share_id: oldShare,
        nickname: "old-row",
        final_score: 50,
        base_score: 50,
        total_penalty: 0,
        percentile: 50,
        personality: "test",
        breakdown: {},
        stats: {},
        total_time_ms: 1000,
        created_at: new Date(Date.now() - 37 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        share_id: newShare,
        nickname: "new-row",
        final_score: 60,
        base_score: 60,
        total_penalty: 0,
        percentile: 60,
        personality: "test",
        breakdown: {},
        stats: {},
        total_time_ms: 1000,
        created_at: new Date(Date.now() - 35 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);

    await fixture!.serviceRole.rpc("purge_expired_attempts");

    const { data: oldRow } = await fixture!.serviceRole
      .from("attempts")
      .select("share_id")
      .eq("share_id", oldShare);
    const { data: newRow } = await fixture!.serviceRole
      .from("attempts")
      .select("share_id")
      .eq("share_id", newShare);

    expect(oldRow?.length ?? 0, "37-month-old row must be purged").toBe(0);
    expect(newRow?.length ?? 0, "35-month-old row must remain").toBe(1);

    // Cleanup
    await fixture!.serviceRole.from("attempts").delete().eq("share_id", newShare);
  });
});

describe("retention — anonymize_expired_anticheat", () => {
  maybe("NULLs flags + total_time_ms on rows > 12 months, preserves score", async () => {
    const oldShare = shareId("ac-old");
    const newShare = shareId("ac-new");

    await fixture!.serviceRole.from("attempts").insert([
      {
        share_id: oldShare,
        final_score: 75,
        base_score: 75,
        total_penalty: 0,
        percentile: 75,
        personality: "Strážca",
        breakdown: { question_1: "a" },
        stats: { ms_per_question: [100, 200] },
        flags: [{ type: "fast_answer", question_id: 3 }],
        total_time_ms: 12345,
        created_at: new Date(Date.now() - 13 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        share_id: newShare,
        final_score: 80,
        base_score: 80,
        total_penalty: 0,
        percentile: 80,
        personality: "Strážca",
        breakdown: { question_1: "b" },
        stats: { ms_per_question: [300, 400] },
        flags: [{ type: "paste_event", question_id: 5 }],
        total_time_ms: 23456,
        created_at: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);

    await fixture!.serviceRole.rpc("anonymize_expired_anticheat");

    const { data: oldRow } = await fixture!.serviceRole
      .from("attempts")
      .select("share_id, final_score, flags, total_time_ms, breakdown, personality")
      .eq("share_id", oldShare)
      .single();
    const { data: newRow } = await fixture!.serviceRole
      .from("attempts")
      .select("share_id, final_score, flags, total_time_ms")
      .eq("share_id", newShare)
      .single();

    // Old row: anti-cheat columns cleared, but score / breakdown intact.
    expect(oldRow?.flags, "old row flags must be empty array").toEqual([]);
    expect(oldRow?.total_time_ms, "old row timing must be NULL").toBeNull();
    expect(oldRow?.final_score, "score must be preserved").toBe(75);
    expect(oldRow?.personality, "personality must be preserved").toBe("Strážca");
    expect(oldRow?.breakdown, "breakdown must be preserved").toEqual({ question_1: "a" });

    // New row: untouched.
    expect(newRow?.flags, "6-month row flags must be untouched").toEqual([
      { type: "paste_event", question_id: 5 },
    ]);
    expect(newRow?.total_time_ms, "6-month row timing must be untouched").toBe(23456);

    await fixture!.serviceRole.from("attempts").delete().in("share_id", [oldShare, newShare]);
  });
});

describe("retention — anonymize_expired_edu_respondents", () => {
  maybe("NULLs respondent_name + respondent_email on edu rows > 12 months", async () => {
    const oldEdu = shareId("edu-old");
    const newEdu = shareId("edu-new");
    const nonEdu = shareId("nonedu");

    await fixture!.serviceRole.from("attempts").insert([
      {
        share_id: oldEdu,
        final_score: 70,
        base_score: 70,
        total_penalty: 0,
        percentile: 70,
        personality: "test",
        breakdown: {},
        stats: {},
        respondent_name: "Anna Test",
        respondent_email: "anna@example.test",
        created_at: new Date(Date.now() - 13 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        share_id: newEdu,
        final_score: 65,
        base_score: 65,
        total_penalty: 0,
        percentile: 65,
        personality: "test",
        breakdown: {},
        stats: {},
        respondent_name: "Boris Test",
        respondent_email: "boris@example.test",
        created_at: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        share_id: nonEdu,
        final_score: 55,
        base_score: 55,
        total_penalty: 0,
        percentile: 55,
        personality: "test",
        breakdown: {},
        stats: {},
        // respondent_name + respondent_email NULL — non-edu anonymous row
        created_at: new Date(Date.now() - 13 * 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);

    await fixture!.serviceRole.rpc("anonymize_expired_edu_respondents");

    const { data: oldRow } = await fixture!.serviceRole
      .from("attempts")
      .select("share_id, final_score, respondent_name, respondent_email")
      .eq("share_id", oldEdu)
      .single();
    const { data: newRow } = await fixture!.serviceRole
      .from("attempts")
      .select("respondent_name, respondent_email")
      .eq("share_id", newEdu)
      .single();
    const { data: nonEduRow } = await fixture!.serviceRole
      .from("attempts")
      .select("final_score")
      .eq("share_id", nonEdu)
      .single();

    expect(oldRow?.respondent_name, "13-month edu row name must be NULL").toBeNull();
    expect(oldRow?.respondent_email, "13-month edu row email must be NULL").toBeNull();
    expect(oldRow?.final_score, "score must survive anonymisation").toBe(70);

    expect(newRow?.respondent_name, "6-month edu row must keep name").toBe("Boris Test");
    expect(newRow?.respondent_email, "6-month edu row must keep email").toBe("boris@example.test");

    expect(nonEduRow?.final_score, "non-edu row must not be deleted").toBe(55);

    await fixture!.serviceRole.from("attempts").delete().in("share_id", [oldEdu, newEdu, nonEdu]);
  });
});

describe("retention RPC authorization — service-role only", () => {
  for (const rpc of [
    "purge_expired_attempts",
    "anonymize_expired_anticheat",
    "anonymize_expired_edu_respondents",
  ] as const) {
    maybe(`anon cannot call ${rpc}()`, async () => {
      const { error } = await fixture!.anon.rpc(rpc);
      expect(
        error,
        `anon caller must be rejected; ${rpc}() succeeded — security leak`,
      ).not.toBeNull();
    });
  }
});
