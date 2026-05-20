// E40.1 — live-SQL test for anonymize_expired_dpa_requests().
//
// The RPC NULLs contact_name + contact_email and sets anonymized_at
// on rows older than 12 months. school_name + dpa_version stay so
// admin stats keep working post-anonymisation.
//
// Wired into the E38 GitHub Actions retention-cron workflow in E40.6.

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

function maybe(name: string, body: () => Promise<void>) {
  it(name, async () => {
    if (!fixture || !alive) return;
    await body();
  });
}

const SCHOOL = () => `e40-anon-${Math.random().toString(36).slice(2, 10)}`;

const monthsAgo = (months: number) =>
  new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString();

describe("anonymize_expired_dpa_requests()", () => {
  maybe("NULLs PII on rows older than 12 months, preserves rows under threshold", async () => {
    const oldSchool = SCHOOL();
    const recentSchool = SCHOOL();

    await fixture!.serviceRole.from("dpa_requests").insert([
      {
        school_name: oldSchool,
        dpa_version: "v0.1",
        contact_name: "Old Contact",
        contact_email: "old@example.com",
        created_at: monthsAgo(13),
      },
      {
        school_name: recentSchool,
        dpa_version: "v0.1",
        contact_name: "Recent Contact",
        contact_email: "recent@example.com",
        created_at: monthsAgo(6),
      },
    ]);

    const { error: rpcError } = await fixture!.serviceRole.rpc("anonymize_expired_dpa_requests");
    expect(rpcError, "RPC must succeed").toBeNull();

    const { data: oldRow } = await fixture!.serviceRole
      .from("dpa_requests")
      .select("contact_name, contact_email, school_name, dpa_version, anonymized_at")
      .eq("school_name", oldSchool)
      .single();
    expect(oldRow?.contact_name).toBeNull();
    expect(oldRow?.contact_email).toBeNull();
    expect(oldRow?.school_name).toBe(oldSchool);
    expect(oldRow?.dpa_version).toBe("v0.1");
    expect(oldRow?.anonymized_at).not.toBeNull();

    const { data: recentRow } = await fixture!.serviceRole
      .from("dpa_requests")
      .select("contact_name, contact_email, anonymized_at")
      .eq("school_name", recentSchool)
      .single();
    expect(recentRow?.contact_name).toBe("Recent Contact");
    expect(recentRow?.contact_email).toBe("recent@example.com");
    expect(recentRow?.anonymized_at).toBeNull();
  });

  maybe(
    "is idempotent — calling twice does not double-process already-anonymised rows",
    async () => {
      const school = SCHOOL();
      await fixture!.serviceRole.from("dpa_requests").insert({
        school_name: school,
        dpa_version: "v0.1",
        contact_name: "First Pass",
        contact_email: "first@example.com",
        created_at: monthsAgo(13),
      });

      await fixture!.serviceRole.rpc("anonymize_expired_dpa_requests");
      const { data: firstPass } = await fixture!.serviceRole
        .from("dpa_requests")
        .select("anonymized_at")
        .eq("school_name", school)
        .single();
      const firstAnonAt = firstPass?.anonymized_at;

      await fixture!.serviceRole.rpc("anonymize_expired_dpa_requests");
      const { data: secondPass } = await fixture!.serviceRole
        .from("dpa_requests")
        .select("anonymized_at")
        .eq("school_name", school)
        .single();

      expect(secondPass?.anonymized_at).toBe(firstAnonAt);
    },
  );

  maybe("anon cannot invoke the RPC (REVOKE EXECUTE)", async () => {
    const { error } = await fixture!.anon.rpc("anonymize_expired_dpa_requests");
    expect(error, "anon must NOT be able to call anonymise RPC").not.toBeNull();
  });
});
