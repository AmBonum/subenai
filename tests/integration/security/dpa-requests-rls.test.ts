// E40.1 — live-SQL RLS contract for dpa_requests.
//
// dpa_requests is admin-read-only. INSERTs flow through the server
// function (E40.2) using service-role, NOT via direct anon writes.
// This spec proves the policies enforce that contract — anon clients
// cannot INSERT or SELECT, service-role can do both.

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

const SCHOOL = () => `e40-school-${Math.random().toString(36).slice(2, 10)}`;

describe("dpa_requests — RLS contract", () => {
  maybe("anon cannot INSERT (no policy grants WRITE to anon)", async () => {
    const { error } = await fixture!.anon.from("dpa_requests").insert({
      school_name: SCHOOL(),
      dpa_version: "v0.1",
      contact_name: "Test Contact",
      contact_email: "test@example.com",
    });
    expect(error, "anon INSERT must be rejected by RLS").not.toBeNull();
  });

  maybe("anon cannot SELECT (admin-only read policy)", async () => {
    const school = SCHOOL();
    await fixture!.serviceRole.from("dpa_requests").insert({
      school_name: school,
      dpa_version: "v0.1",
      contact_name: "Test Contact",
      contact_email: "test@example.com",
    });
    const { data, error } = await fixture!.anon
      .from("dpa_requests")
      .select("*")
      .eq("school_name", school);
    expect(
      error !== null || (data?.length ?? 0) === 0,
      "anon must not see rows inserted by service-role",
    ).toBe(true);
  });

  maybe("service-role can INSERT + SELECT (bypasses RLS)", async () => {
    const school = SCHOOL();
    const { error: insertError } = await fixture!.serviceRole.from("dpa_requests").insert({
      school_name: school,
      dpa_version: "v0.1",
      contact_name: "Service Role",
      contact_email: "sr@example.com",
    });
    expect(insertError, "service-role INSERT should succeed").toBeNull();

    const { data, error: selectError } = await fixture!.serviceRole
      .from("dpa_requests")
      .select("school_name, dpa_version, status, email_status")
      .eq("school_name", school)
      .single();
    expect(selectError, "service-role SELECT should succeed").toBeNull();
    expect(data?.dpa_version).toBe("v0.1");
    expect(data?.status).toBe("pending");
    expect(data?.email_status).toBe("pending");
  });

  maybe(
    "anonymised-consistency CHECK forbids anonymized_at set with PII still present",
    async () => {
      const school = SCHOOL();
      const { error } = await fixture!.serviceRole.from("dpa_requests").insert({
        school_name: school,
        dpa_version: "v0.1",
        contact_name: "Still Here",
        contact_email: "still@example.com",
        anonymized_at: new Date().toISOString(),
      });
      expect(error, "CHECK constraint must reject mismatched anonymisation state").not.toBeNull();
    },
  );

  maybe("status CHECK rejects unknown values", async () => {
    const { error } = await fixture!.serviceRole.from("dpa_requests").insert({
      school_name: SCHOOL(),
      dpa_version: "v0.1",
      // intentionally invalid status for the test
      status: "not-a-status",
    });
    expect(error, "status CHECK must reject unknown values").not.toBeNull();
  });
});
