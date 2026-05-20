// E42 / P-22 — AML cap of 500 € on single sponsorship payments.
//
// `/privacy` s7 declares: "Maximálna jednorazová suma 500 € — držíme
// limit pod hranicou KYC povinnosti per § 10 zákona č. 297/2008 Z. z."
// This spec locks both the constant value and the two enforcement
// sites in `functions/api/*.ts` that consult it.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { MAX_AML_AMOUNT_EUR } from "../../functions/api/stripe-webhook";

describe("MAX_AML_AMOUNT_EUR — AML cap constant (P-22)", () => {
  it("is exported as the value 500 € per /privacy s7 declaration", () => {
    expect(MAX_AML_AMOUNT_EUR).toBe(500);
  });

  it("is referenced by create-checkout-session.ts on the input-validation path", () => {
    const handler = readFileSync(
      resolve(process.cwd(), "functions/api/create-checkout-session.ts"),
      "utf8",
    );
    expect(handler).toContain("MAX_AML_AMOUNT_EUR");
    expect(handler).toMatch(/amount\s*>\s*MAX_AML_AMOUNT_EUR/);
  });

  it("is referenced by stripe-webhook.ts on the post-payment validation path", () => {
    const webhook = readFileSync(resolve(process.cwd(), "functions/api/stripe-webhook.ts"), "utf8");
    // The webhook should reject any payment whose amount exceeds the
    // cap, even if Stripe somehow let it through (belt-and-braces).
    expect(webhook).toMatch(/amountEur\s*>\s*MAX_AML_AMOUNT_EUR/);
    expect(webhook).toContain("aml_limit_exceeded");
  });
});
