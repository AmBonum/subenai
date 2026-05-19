import type { BrowserContext } from "@playwright/test";

import { CONSENT_VERSION } from "../../src/lib/consent";

/**
 * Pre-seed the cookie consent decision so a test that doesn't care
 * about the banner can skip past it without a click.
 *
 * Usage:
 *   import { test } from "@/e2e/fixtures/base";
 *   import { primeConsent } from "@/e2e/fixtures/consent";
 *
 *   test.beforeEach(async ({ context }) => {
 *     await primeConsent(context, "all");   // or "necessary-only"
 *   });
 *
 * The shape mirrors what the app writes to localStorage (see
 * `src/lib/consent.ts`). The version constant is imported directly from
 * that module so the two cannot drift; bumping CONSENT_VERSION at the
 * source automatically refreshes every primed fixture.
 */
export type ConsentPreset = "all" | "necessary-only";

const CONSENT_STORAGE_KEY = "iiq_consent";

export async function primeConsent(context: BrowserContext, preset: ConsentPreset): Promise<void> {
  const granted = preset === "all";
  const record = {
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    categories: {
      necessary: true,
      preferences: granted,
      analytics: granted,
      marketing: granted,
    },
  };
  await context.addInitScript(
    ({ key, value }: { key: string; value: string }) => {
      window.localStorage.setItem(key, value);
    },
    { key: CONSENT_STORAGE_KEY, value: JSON.stringify(record) },
  );
}
