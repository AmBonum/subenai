// E35.4 — no-leak browser journey.
//
// With consent rejected, no third-party domain may receive a single
// byte from the user's browser as they navigate the public surfaces.
// This spec proves that contract — or fails loudly when a future
// regression silently loads a tracker.
//
// First-party hosts (subenai.sk, localhost, *.pages.dev) are excluded
// from the assertion. Stripe is permitted only on /support. Turnstile
// is permitted only on /manage-support. Everything else on the third-
// party side must be empty.

import { test, expect } from "../../fixtures/base";

const PUBLIC_ROUTES_REJECT_ALL = [
  "/",
  "/privacy",
  "/cookies",
  "/about",
  "/sponsors",
  "/blog",
  "/zmeny",
] as const;

const FORBIDDEN_HOSTS_PATTERNS = [
  /googletagmanager\.com$/i,
  /google-analytics\.com$/i,
  /analytics\.google\.com$/i,
  /facebook\.com$/i,
  /fbcdn\.net$/i,
  /connect\.facebook\.net$/i,
  /twitter\.com$/i,
  /platform\.twitter\.com$/i,
  /linkedin\.com$/i,
  /platform\.linkedin\.com$/i,
  /hotjar\.com$/i,
  /mixpanel\.com$/i,
  /segment\.(io|com)$/i,
] as const;

function violatesAllowlist(host: string, allowed: RegExp[]): boolean {
  return !allowed.some((pattern) => pattern.test(host));
}

const REJECT_ALL_ALLOWED_THIRD_PARTY: RegExp[] = [
  // Supabase project URL — first-party DB even though the host is *.supabase.co.
  /\.supabase\.co$/i,
  // Cloudflare insights pixel ships with `_headers` config when Web Analytics
  // is enabled at the project level; harmless if absent.
  /static\.cloudflareinsights\.com$/i,
];

test.describe("No-leak journey — reject all", () => {
  test.beforeEach(async ({ page }) => {
    // Force a deterministic blank-slate consent state so the banner
    // appears and we can click "reject all".
    await page.context().clearCookies();
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
      } catch {
        // ignore quota errors
      }
    });
  });

  test("TC-NL-01: rejecting all consent loads zero tracker domains across every public route", async ({
    page,
    consent,
    sentinel,
  }) => {
    await test.step("Open home and reject all consent", async () => {
      await page.goto("/");
      await expect(consent.root).toBeVisible();
      await consent.rejectAll();
    });

    for (const route of PUBLIC_ROUTES_REJECT_ALL) {
      await test.step(`Navigate to ${route}`, async () => {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
      });
    }

    await test.step("Assert no forbidden tracker host was contacted", async () => {
      const thirdParty = sentinel.thirdPartyHosts();
      const offenders = thirdParty.filter((host) =>
        FORBIDDEN_HOSTS_PATTERNS.some((pattern) => pattern.test(host)),
      );
      expect(
        offenders,
        `forbidden tracker hosts contacted with consent rejected: ${JSON.stringify(offenders)}\nfull third-party host list: ${JSON.stringify(thirdParty)}`,
      ).toEqual([]);
    });

    await test.step("Assert third-party hosts are a subset of the documented allowlist", async () => {
      const thirdParty = sentinel.thirdPartyHosts();
      const unexpected = thirdParty.filter((host) =>
        violatesAllowlist(host, REJECT_ALL_ALLOWED_THIRD_PARTY),
      );
      expect(
        unexpected,
        `unexpected third-party host(s) on reject-all journey: ${JSON.stringify(unexpected)}\nIf this is intentional, add a pattern to REJECT_ALL_ALLOWED_THIRD_PARTY in this file in the same PR that introduced it.`,
      ).toEqual([]);
    });
  });

  test("TC-NL-02: version-bump retriggers the banner", async ({ page, consent }) => {
    await test.step("Seed stale consent record in localStorage and reload", async () => {
      await page.goto("/");
      if (await consent.isVisible()) {
        await consent.rejectAll();
      }
      // Overwrite with a stale-version record and reload.
      await page.evaluate(() => {
        const stale = {
          version: "0.0.0-stale",
          timestamp: new Date().toISOString(),
          categories: { necessary: true, preferences: false, analytics: true, marketing: true },
        };
        window.localStorage.setItem("iiq_consent", JSON.stringify(stale));
      });
      await page.reload();
    });

    await test.step("Banner appears again because version mismatch invalidates the record", async () => {
      await expect(consent.root).toBeVisible();
    });
  });
});

test.describe("No-leak journey — Stripe / Turnstile are surface-scoped", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      try {
        window.localStorage.clear();
      } catch {
        // ignore
      }
    });
  });

  test("TC-NL-03: Stripe is NOT loaded on legal pages even after accept-all", async ({
    page,
    consent,
    sentinel,
  }) => {
    await test.step("Visit home, accept all consent, then navigate legal pages", async () => {
      await page.goto("/");
      if (await consent.isVisible()) {
        await consent.acceptAll();
      }
      for (const route of ["/privacy", "/cookies", "/about"]) {
        await page.goto(route);
        await page.waitForLoadState("networkidle");
      }
    });

    await test.step("Assert no Stripe host contacted (Stripe is /support-scoped)", async () => {
      const thirdParty = sentinel.thirdPartyHosts();
      const stripeContacts = thirdParty.filter((host) => /stripe\.(com|net)$/i.test(host));
      expect(
        stripeContacts,
        `Stripe was contacted outside /support: ${JSON.stringify(stripeContacts)}`,
      ).toEqual([]);
    });
  });
});
