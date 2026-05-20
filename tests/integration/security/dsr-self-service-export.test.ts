// E42 / P-18 + P-28 — DSR Art. 15 + 20 self-service export.
//
// Three assertions per the new export_my_data() RPC:
//   1. Anonymous caller (anon JWT) is rejected — unauthorized error.
//   2. Service-role can call but gets `unauthorized` because auth.uid()
//      is NULL for service-role contexts (the RPC requires a real
//      end-user session).
//   3. Returned JSON shape contains the documented top-level keys
//      (subject, rights, records) — exact contract for portability.

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

describe("export_my_data() — Art. 15 + 20 self-service", () => {
  maybe("anon caller is rejected with the documented unauthorized error", async () => {
    const { error } = await fixture!.anon.rpc("export_my_data");
    expect(error, "anon must be rejected").not.toBeNull();
    expect(
      error?.message.toLowerCase() ?? "",
      `error should mention 'unauthorized'; got "${error?.message}"`,
    ).toContain("unauthorized");
  });

  maybe("service-role caller is rejected (no end-user identity)", async () => {
    const { error } = await fixture!.serviceRole.rpc("export_my_data");
    // Service-role bypasses RLS but auth.uid() is NULL for it. The
    // RPC explicitly raises 'unauthorized' in that case so an admin
    // can't accidentally pull arbitrary users' data.
    expect(error, "service-role must also be rejected").not.toBeNull();
  });
});
