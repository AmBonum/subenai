// @vitest-environment node
//
// E38.3 — unit test for the retention runner script.
//
// The script (`scripts/run-retention.mjs`) exports `main(deps)` for
// testability. The test injects a mock `createClient` and asserts:
//
//   1. All three RPCs get called in declared order.
//   2. main() returns 0 on success, 2 on any RPC error.
//   3. DRY_RUN=1 skips RPC invocation entirely.
//   4. Missing env returns 1 (config error).

import { afterEach, beforeEach, describe, expect, it } from "vitest";

interface RpcResult {
  data: unknown;
  error: { message: string } | null;
}

function makeMockClient(results: Record<string, RpcResult>) {
  const calls: string[] = [];
  const client = {
    rpc(name: string) {
      calls.push(name);
      const result = results[name] ?? { data: 0, error: null };
      return Promise.resolve(result);
    },
  };
  return { calls, createClient: () => client };
}

const ENV_BACKUP = { ...process.env };

beforeEach(() => {
  process.env = {
    ...ENV_BACKUP,
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-jwt",
    DRY_RUN: "",
  };
});

afterEach(() => {
  process.env = { ...ENV_BACKUP };
});

describe("scripts/run-retention.mjs — main()", () => {
  it("calls all four RPCs in declared order and returns 0", async () => {
    const { calls, createClient } = makeMockClient({
      purge_expired_attempts: { data: 3, error: null },
      anonymize_expired_anticheat: { data: 7, error: null },
      anonymize_expired_edu_respondents: { data: 2, error: null },
      anonymize_expired_dpa_requests: { data: 1, error: null },
    });
    const { main } = await import("../../scripts/run-retention.mjs");
    const code = await main({ createClient });
    expect(code).toBe(0);
    expect(calls).toEqual([
      "purge_expired_attempts",
      "anonymize_expired_anticheat",
      "anonymize_expired_edu_respondents",
      "anonymize_expired_dpa_requests",
    ]);
  });

  it("returns 2 when any RPC errors, but still attempts every RPC", async () => {
    const { calls, createClient } = makeMockClient({
      purge_expired_attempts: { data: 0, error: null },
      anonymize_expired_anticheat: { data: null, error: { message: "permission denied" } },
      anonymize_expired_edu_respondents: { data: 0, error: null },
      anonymize_expired_dpa_requests: { data: 0, error: null },
    });
    const { main } = await import("../../scripts/run-retention.mjs");
    const code = await main({ createClient });
    expect(code).toBe(2);
    expect(calls, "every RPC must still be attempted").toEqual([
      "purge_expired_attempts",
      "anonymize_expired_anticheat",
      "anonymize_expired_edu_respondents",
      "anonymize_expired_dpa_requests",
    ]);
  });

  it("DRY_RUN=1 returns 0 without invoking any RPC", async () => {
    process.env.DRY_RUN = "1";
    const { calls, createClient } = makeMockClient({});
    const { main } = await import("../../scripts/run-retention.mjs");
    const code = await main({ createClient });
    expect(code).toBe(0);
    expect(calls, "dry-run must skip RPC invocation").toEqual([]);
  });

  it("returns 1 when SUPABASE_URL is missing", async () => {
    delete process.env.SUPABASE_URL;
    const { createClient } = makeMockClient({});
    const { main } = await import("../../scripts/run-retention.mjs");
    expect(await main({ createClient })).toBe(1);
  });

  it("returns 1 when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const { createClient } = makeMockClient({});
    const { main } = await import("../../scripts/run-retention.mjs");
    expect(await main({ createClient })).toBe(1);
  });
});
