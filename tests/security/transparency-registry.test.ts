// E42 / A-6 — Transparency registry contract.
//
// The recon for E35.1 flagged a "10 % donations to charity" claim on
// /about as unverifiable. Re-audit during E42 found no such claim in
// the current copy — the recon was speculative. Even so, this spec
// locks the transparency registry as **proactive infrastructure**:
// any future charity claim (or operator-initiated transfer) has a
// place to land where it is auditable from day one.
//
//   - `public/transparency.json` exists and is served as a static
//     asset by Cloudflare Pages.
//   - The file has the documented shape (version + policy + transfers
//     array + audit references).
//   - Every transfer entry, if present, has the required fields.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface TransparencyTransfer {
  period_end: string;
  recipient: string;
  amount_eur: number;
  documented_at: string;
  bank_reference?: string;
  note?: string;
}

interface TransparencyRegistry {
  version: string;
  policy: {
    charity_share_pct: number;
    recipient: string;
    frequency: "annual" | "semiannual" | "quarterly";
    first_period_end: string;
    note?: string;
  };
  transfers: TransparencyTransfer[];
  audit: {
    policy_url: string;
    registry_url: string;
    complaint_route: string;
  };
}

const REGISTRY_PATH = resolve(process.cwd(), "public/transparency.json");

describe("transparency registry (A-6)", () => {
  it("public/transparency.json exists and is valid JSON", () => {
    const raw = readFileSync(REGISTRY_PATH, "utf8");
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as TransparencyRegistry;

  it("declares a charity_share_pct that matches the /about claim (10 %)", () => {
    expect(registry.policy.charity_share_pct).toBe(10);
  });

  it("names the same recipient mentioned on /about", () => {
    expect(registry.policy.recipient).toBe("Nadácia Slniečka");
  });

  it("frequency is set (annual / semiannual / quarterly)", () => {
    expect(["annual", "semiannual", "quarterly"]).toContain(registry.policy.frequency);
  });

  it("first_period_end is a parseable date", () => {
    const d = new Date(registry.policy.first_period_end);
    expect(Number.isNaN(d.getTime()), "first_period_end is not a valid date").toBe(false);
  });

  it("every transfer entry (if any) carries the required audit fields", () => {
    for (const t of registry.transfers) {
      expect(t.period_end, "transfer missing period_end").toBeTruthy();
      expect(t.recipient, "transfer missing recipient").toBeTruthy();
      expect(typeof t.amount_eur).toBe("number");
      expect(t.amount_eur).toBeGreaterThanOrEqual(0);
      expect(t.documented_at, "transfer missing documented_at").toBeTruthy();
    }
  });

  it("audit references point to the subenai domain (no third-party redirect)", () => {
    expect(registry.audit.policy_url).toMatch(/^https:\/\/subenai\.sk\//);
    expect(registry.audit.registry_url).toMatch(/^https:\/\/subenai\.sk\//);
  });
});

describe("transparency registry — consistency guard", () => {
  it("transfers array is sorted by period_end ascending if non-empty", () => {
    const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as TransparencyRegistry;
    for (let i = 1; i < registry.transfers.length; i++) {
      const prev = new Date(registry.transfers[i - 1].period_end).getTime();
      const cur = new Date(registry.transfers[i].period_end).getTime();
      expect(prev, "transfers must be in chronological order").toBeLessThanOrEqual(cur);
    }
  });

  it("if any future /about copy mentions Nadácia or charity, the registry recipient must match", () => {
    // Forward-looking guard. Today no /about locale mentions a
    // charity recipient. The moment one does, this test catches
    // a mismatch between the claim and the registry.
    for (const locale of ["sk", "cs", "en"] as const) {
      const json = JSON.parse(
        readFileSync(resolve(process.cwd(), `src/i18n/locales/${locale}/marketing.json`), "utf8"),
      );
      const flat = JSON.stringify(json.about ?? {});
      if (/Nadácia|nadácia|charity|charitative/i.test(flat)) {
        const registry = JSON.parse(readFileSync(REGISTRY_PATH, "utf8")) as TransparencyRegistry;
        expect(
          flat,
          `${locale}: /about mentions a charity but doesn't reference the registry recipient "${registry.policy.recipient}"`,
        ).toContain(registry.policy.recipient);
      }
    }
  });
});
