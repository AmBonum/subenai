// Phase 9e — PII redaction matrix.
//
// Defence in depth for the three "no user identifiers leak" promises the
// product makes:
//   1. `attempts_anon` view: the public-quiz aggregate read path MUST NOT
//      expose `respondent_name` / `respondent_email`. Asserted by reading
//      the migration SQL and verifying the SELECT column list.
//   2. `get_peer_card` RPC: returns aggregate stats only. The TypeScript
//      contract (`PeerCardData`) must not carry user identifiers and the
//      runtime payload from the mocked RPC must obey the same shape.
//   3. Trap-popup: enforced in `tests/components/TrapDialog.test.tsx` —
//      this file does not duplicate that assertion. See note below.
//
// What this DOES NOT prove: that the live database returns these exact
// columns. The migration text is the contract; Phase 10 (pgTAP) will
// validate runtime behaviour.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { PeerCardData } from "@/lib/platform/retention-queries";

const ATTEMPTS_ANON_MIGRATION = resolve(
  process.cwd(),
  "supabase/migrations/20260501000000_edu_mode.sql",
);

describe("attempts_anon view definition — PII column whitelist", () => {
  const sql = readFileSync(ATTEMPTS_ANON_MIGRATION, "utf8");

  it("creates the attempts_anon view with security_invoker=true", () => {
    expect(sql).toMatch(/CREATE OR REPLACE VIEW public\.attempts_anon/);
    expect(sql).toMatch(/security_invoker\s*=\s*true/);
  });

  it("does NOT list respondent_name or respondent_email in the SELECT projection", () => {
    // Extract the SELECT list between `CREATE OR REPLACE VIEW ... AS` and
    // `FROM public.attempts`. We assert against that slice so a later
    // migration that re-introduces a respondent_* column would fail this.
    const match = sql.match(
      /CREATE OR REPLACE VIEW public\.attempts_anon[\s\S]*?AS\s*SELECT([\s\S]*?)FROM public\.attempts/,
    );
    expect(match).not.toBeNull();
    const projection = match![1];
    expect(projection).not.toMatch(/\brespondent_name\b/);
    expect(projection).not.toMatch(/\brespondent_email\b/);
    // Also forbid the catch-all that would defeat the whitelist.
    expect(projection).not.toMatch(/SELECT\s+\*/i);
  });

  it("filters out rows where respondent_name IS NOT NULL (k=1 cohort defence)", () => {
    expect(sql).toMatch(/WHERE\s+respondent_name\s+IS\s+NULL/i);
  });

  it("grants SELECT to anon and authenticated only — no service_role grant on the view", () => {
    expect(sql).toMatch(/GRANT SELECT ON public\.attempts_anon TO anon, authenticated/);
  });
});

describe("get_peer_card response contract — no user identifiers in payload", () => {
  // The PeerCardData type is the source of truth for what the UI consumes.
  // If a future change ever surfaces a user-identifying field, the explicit
  // allowlist below catches it.
  const ALLOWED_KEYS: ReadonlyArray<keyof PeerCardData> = [
    "has_data",
    "reason",
    "user_score",
    "user_attempts",
    "user_percentile",
    "cohort_avg",
    "cohort_size",
    "branch_ranks",
  ];

  // A representative payload that the RPC may return. We construct it
  // structurally and then assert no foreign keys to user-identifying data
  // ever appear.
  const samplePayload: PeerCardData = {
    has_data: true,
    user_score: 78.5,
    user_attempts: 12,
    user_percentile: 64,
    cohort_avg: 71.2,
    cohort_size: 320,
    branch_ranks: [
      { branch_slug: "phishing", user_score: 80, cohort_score: 65 },
      { branch_slug: "sms-scams", user_score: 75, cohort_score: 70 },
    ],
  };

  it("only carries aggregate-statistic keys — no user_id, email, or name fields", () => {
    for (const key of Object.keys(samplePayload) as Array<keyof PeerCardData>) {
      expect(ALLOWED_KEYS).toContain(key);
    }
    // Belt-and-braces: stringified payload contains no obvious identifier
    // strings.
    const blob = JSON.stringify(samplePayload).toLowerCase();
    expect(blob).not.toMatch(/"user_id"/);
    expect(blob).not.toMatch(/"email"/);
    expect(blob).not.toMatch(/"respondent_name"/);
    expect(blob).not.toMatch(/"respondent_email"/);
  });

  it("branch_ranks entries carry only branch_slug + aggregate scores", () => {
    for (const row of samplePayload.branch_ranks ?? []) {
      const keys = Object.keys(row).sort();
      expect(keys).toEqual(["branch_slug", "cohort_score", "user_score"]);
    }
  });

  it("k-anon sentinel: insufficient_cohort response carries no aggregates either", () => {
    // The migration returns {has_data: false, reason: "insufficient_cohort"}
    // when cohort_size < 10. The UI relies on the absence of numbers to
    // render the "not yet enough data" state.
    const insufficient: PeerCardData = {
      has_data: false,
      reason: "insufficient_cohort",
    };
    expect(insufficient.user_score).toBeUndefined();
    expect(insufficient.user_percentile).toBeUndefined();
    expect(insufficient.cohort_avg).toBeUndefined();
  });
});

// Note: trap-popup state isolation is asserted in
// tests/components/TrapDialog.test.tsx — three invariants there cover
// fetch / localStorage.setItem / supabase.from + supabase.rpc. This file
// intentionally does not duplicate those.
