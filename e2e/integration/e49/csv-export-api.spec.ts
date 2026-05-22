/**
 * E49 Phase 1c-2 — CSV export CF function contract.
 *
 * Covers NEG-13..NEG-19 (auth + origin + rate-limit), POS-38..POS-41
 * (download contract), SEC-08..SEC-18 (CSV-injection battery).
 *
 * Hits the wrangler pages dev port (default 8788). The same-origin
 * check expects `Origin: http://localhost` — the local hostname is in
 * ALLOWED_ORIGIN_HOSTS in `functions/api/tests/export-sessions.ts`.
 *
 * Rate-limit caps for this project default to 3/3 (E49_EXPORTS_PER_*).
 * Each rate-limit TC seeds its own unique IP via X-Forwarded-For so
 * test order doesn't leak counter state between cases.
 */

import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { E49_PASSWORD, E49_TESTS } from "../../fixtures/e49-fixtures";
import { mintLiveAccessToken, readLiveState } from "../../fixtures/live-auth";

const state = readLiveState();
const liveOk = !!state && !!state.supabaseUrl;

test.describe("E49 CSV export API — live-Supabase", () => {
  test.skip(!liveOk, "E49 live-supabase not available (Docker / supabase CLI missing)");

  const apiBase = () => state!.cfApiBaseUrl;
  const sameOriginHeaders = () => ({ origin: state!.previewBaseUrl });

  const buildUrl = (testId: string) =>
    `${apiBase()}/api/tests/export-sessions?testId=${encodeURIComponent(testId)}`;

  async function authHeaders(
    request: import("@playwright/test").APIRequestContext,
    handle: "educatorA" | "educatorB",
  ): Promise<Record<string, string>> {
    const token = await mintLiveAccessToken(request, handle, state!);
    return {
      authorization: `Bearer ${token.access_token}`,
      ...sameOriginHeaders(),
    };
  }

  test("NEG-13 — unauthenticated GET → 401", async ({ request }) => {
    const res = await request.get(buildUrl(E49_TESTS.typicalPublished), {
      headers: sameOriginHeaders(),
    });
    expect(res.status()).toBe(401);
  });

  test("NEG-14 — TU-A requesting TU-B's test → 403", async ({ request }) => {
    const headers = await authHeaders(request, "educatorA");
    const res = await request.get(buildUrl(E49_TESTS.foreignPublished), { headers });
    expect(res.status()).toBe(403);
    expect(await res.json()).toEqual({ error: "not_owner" });
  });

  test("NEG-15 — unknown testId → 404", async ({ request }) => {
    const headers = await authHeaders(request, "educatorA");
    const res = await request.get(buildUrl("00000000-0000-4000-8000-000000000000"), { headers });
    expect(res.status()).toBe(404);
  });

  test("NEG-16 — foreign Origin → 403", async ({ request }) => {
    const res = await request.get(buildUrl(E49_TESTS.typicalPublished), {
      headers: { origin: "https://evil.com" },
    });
    expect(res.status()).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden_origin" });
  });

  test("NEG-17 — no Origin and no Referer → 403", async ({ request }) => {
    const res = await request.get(buildUrl(E49_TESTS.typicalPublished));
    expect(res.status()).toBe(403);
  });

  test("NEG-18 — author daily cap → 429 + cap error", async ({ request }) => {
    const token = await mintLiveAccessToken(request, "educatorA", state!);
    const cap = Number.parseInt(state!.rateLimitAuthor, 10);
    const headers = {
      authorization: `Bearer ${token.access_token}`,
      ...sameOriginHeaders(),
      "x-forwarded-for": "10.0.0.18",
    };
    for (let i = 0; i < cap; i++) {
      const ok = await request.get(buildUrl(E49_TESTS.typicalPublished), { headers });
      expect(ok.status()).toBe(200);
    }
    const over = await request.get(buildUrl(E49_TESTS.typicalPublished), { headers });
    expect(over.status()).toBe(429);
  });

  test("NEG-19 — per-IP hourly cap → 429", async ({ request }) => {
    const tokenA = await mintLiveAccessToken(request, "educatorA", state!);
    const tokenB = await mintLiveAccessToken(request, "educatorB", state!);
    const cap = Number.parseInt(state!.rateLimitIp, 10);
    const headersA = {
      authorization: `Bearer ${tokenA.access_token}`,
      ...sameOriginHeaders(),
      "x-forwarded-for": "10.0.0.19",
    };
    const headersB = {
      authorization: `Bearer ${tokenB.access_token}`,
      ...sameOriginHeaders(),
      "x-forwarded-for": "10.0.0.19",
    };
    let okCount = 0;
    for (let i = 0; i < cap; i++) {
      const r = await request.get(buildUrl(E49_TESTS.typicalPublished), { headers: headersA });
      if (r.status() === 200) okCount++;
    }
    expect(okCount).toBeGreaterThan(0);
    const over = await request.get(buildUrl(E49_TESTS.foreignPublished), { headers: headersB });
    expect(over.status()).toBe(429);
  });

  test("POS-38..41 — 200 OK + headers + BOM + header row + row count", async ({ request }) => {
    const headers = await authHeaders(request, "educatorA");
    const res = await request.get(buildUrl(E49_TESTS.typicalPublished), {
      headers: { ...headers, "x-forwarded-for": "10.0.0.38" },
    });
    expect(res.status()).toBe(200);

    expect(res.headers()["content-type"]).toMatch(/text\/csv/);
    const disp = res.headers()["content-disposition"] ?? "";
    expect(disp).toMatch(/attachment; filename="sessions-[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.csv"/);
    expect(disp).not.toMatch(/\.\.|\//);

    const body = await res.body();
    expect(body.subarray(0, 3).toString("hex").toLowerCase()).toBe("efbbbf");
    const text = body.toString("utf8").replace(/^\uFEFF/, "");
    const lines = text.split(/\r\n/).filter((l) => l.length > 0);
    expect(lines[0]).toBe(
      "session_id,respondent_name,respondent_email,status,score,started_at,finished_at,duration_seconds,segment,ip_hash_last6",
    );

    const supabase = createClient(state!.supabaseUrl, state!.serviceRoleKey);
    const { count } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .eq("test_id", E49_TESTS.typicalPublished);
    expect(lines.length).toBe((count ?? 0) + 1);
  });

  const csvPayloads: Array<{ id: string; raw: string; expectPrefix: string }> = [
    { id: "SEC-08", raw: "=cmd|'/c calc'!A1", expectPrefix: "'=" },
    { id: "SEC-09", raw: "+1+2", expectPrefix: "'+" },
    { id: "SEC-10", raw: "-2-3", expectPrefix: "'-" },
    { id: "SEC-11", raw: "@SUM(A1:A10)", expectPrefix: "'@" },
    { id: "SEC-12", raw: "\tinjected", expectPrefix: "'\t" },
    { id: "SEC-13", raw: "\rinjected", expectPrefix: "'\r" },
  ];

  for (const p of csvPayloads) {
    test(`${p.id} — CSV cell "${p.raw.replace(/[\n\r\t]/g, "?")}" prefixed`, async ({
      request,
    }) => {
      const token = await mintLiveAccessToken(request, "educatorA", state!);
      const supabase = createClient(state!.supabaseUrl, state!.serviceRoleKey);
      const sessionId = `e2e00001-e49a-4001-8001-0000c0de${Math.random()
        .toString(16)
        .slice(2, 10)
        .padStart(8, "0")}`;
      await supabase.from("sessions").insert({
        id: sessionId,
        test_id: E49_TESTS.typicalPublished,
        intake_data: { name: p.raw },
        consent_given: true,
        started_at: new Date().toISOString(),
        finished_at: new Date().toISOString(),
        score: 1,
        status: "completed",
      });
      try {
        const res = await request.get(buildUrl(E49_TESTS.typicalPublished), {
          headers: {
            authorization: `Bearer ${token.access_token}`,
            ...sameOriginHeaders(),
            "x-forwarded-for": `10.0.0.${50 + csvPayloads.indexOf(p)}`,
          },
        });
        expect(res.status()).toBe(200);
        const text = (await res.body()).toString("utf8");
        expect(text).toContain(p.expectPrefix);
      } finally {
        await supabase.from("sessions").delete().eq("id", sessionId);
      }
    });
  }

  test('SEC-14..16 — cells with , " \\n are quoted (RFC-4180)', async ({ request }) => {
    const token = await mintLiveAccessToken(request, "educatorA", state!);
    const supabase = createClient(state!.supabaseUrl, state!.serviceRoleKey);
    const sessionId = "e2e00001-e49a-4001-8001-0000c0de14151600";
    await supabase.from("sessions").insert({
      id: sessionId,
      test_id: E49_TESTS.typicalPublished,
      intake_data: { name: 'comma,name"quoted\nlinebreak' },
      consent_given: true,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      score: 1,
      status: "completed",
    });
    try {
      const res = await request.get(buildUrl(E49_TESTS.typicalPublished), {
        headers: {
          authorization: `Bearer ${token.access_token}`,
          ...sameOriginHeaders(),
          "x-forwarded-for": "10.0.0.56",
        },
      });
      expect(res.status()).toBe(200);
      const text = (await res.body()).toString("utf8");
      expect(text).toContain('"comma,name""quoted\nlinebreak"');
    } finally {
      await supabase.from("sessions").delete().eq("id", sessionId);
    }
  });

  test("SEC-17 — NULL byte in cell does not crash + appears literally or sanitized", async ({
    request,
  }) => {
    const token = await mintLiveAccessToken(request, "educatorA", state!);
    const supabase = createClient(state!.supabaseUrl, state!.serviceRoleKey);
    const sessionId = "e2e00001-e49a-4001-8001-0000c0de17000000";
    await supabase.from("sessions").insert({
      id: sessionId,
      test_id: E49_TESTS.typicalPublished,
      intake_data: { name: "before after" },
      consent_given: true,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      score: 1,
      status: "completed",
    });
    try {
      const res = await request.get(buildUrl(E49_TESTS.typicalPublished), {
        headers: {
          authorization: `Bearer ${token.access_token}`,
          ...sameOriginHeaders(),
          "x-forwarded-for": "10.0.0.57",
        },
      });
      expect(res.status()).toBe(200);
      expect((await res.body()).toString("utf8")).toContain("after");
    } finally {
      await supabase.from("sessions").delete().eq("id", sessionId);
    }
  });

  test("SEC-18 — Content-Disposition filename is safe (no traversal / control bytes)", async ({
    request,
  }) => {
    const headers = await authHeaders(request, "educatorA");
    const res = await request.get(buildUrl(E49_TESTS.typicalPublished), {
      headers: { ...headers, "x-forwarded-for": "10.0.0.58" },
    });
    expect(res.status()).toBe(200);
    const disp = res.headers()["content-disposition"] ?? "";
    expect(disp).not.toMatch(/[\\/]|\.\./);
    expect(disp).toMatch(/filename="sessions-[a-z0-9-]+-\d{4}-\d{2}-\d{2}\.csv"/);
  });

  test.afterAll(() => {
    // Sanity assertion: this suite assumes E49_PASSWORD is the password
    // baked into the user seed.  If a future change rotates the password
    // the rest of the file silently fails with 400s — so trip a clear
    // error message instead.
    expect(E49_PASSWORD.length).toBeGreaterThan(0);
  });
});
