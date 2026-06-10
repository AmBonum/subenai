import { test, expect } from "../../fixtures/base";

// E40 — `/schools/dpa` route smoke.
//
// Why no happy-path form submission here:
//   - The form gates behind Cloudflare Turnstile + the build-time flag
//     `VITE_DPA_FLOW_ENABLED`. Driving a real Turnstile widget in
//     Playwright either needs Cloudflare's sandbox keys
//     (1x00000000000000000000AA / 1x0000000000000000000000000000000AA)
//     wired into the preview build, or a runtime override that the
//     production code path does not have.
//   - The PDF render lazy-imports `@react-pdf/renderer` which pulls in
//     `yoga-layout-wasm`. That requires `wasm-unsafe-eval` in CSP. The
//     CSP is already correct (locked by `tests/security/headers-contract.ts`)
//     but headless Chromium + WASM is the kind of thing that introduces
//     flake on slow CI runners.
//   - The handler logic, PDF render, and email path each have direct
//     vitest coverage that runs in <10s — far cheaper than a browser
//     round-trip.
//
// So this spec sticks to the route shell: shared chrome (back-link,
// heading, intro) + branch detection. Either the form OR the
// feature-disabled fallback must be visible — never both, never
// neither. That single invariant catches any future regression where
// the route accidentally renders empty.

test.describe("/schools/dpa — DPA intake route", () => {
  test("page renders shared chrome (back-link + heading + intro)", async ({ schoolsDpa }) => {
    await schoolsDpa.open();
    await expect(schoolsDpa.main).toBeVisible();
    await expect(schoolsDpa.backLink).toBeVisible();
    await expect(schoolsDpa.backLink).toHaveAttribute("href", "/schools");
    await expect(schoolsDpa.heading).toBeVisible();
    await expect(schoolsDpa.intro).toBeVisible();
  });

  test("renders exactly ONE of {form, feature-disabled fallback}", async ({ schoolsDpa }) => {
    await schoolsDpa.open();
    const formVisible = await schoolsDpa.form.isVisible().catch(() => false);
    const fallbackVisible = await schoolsDpa.featureDisabledFallback.isVisible().catch(() => false);
    // XOR — flag ON shows the form, flag OFF shows the mailto fallback.
    // Both visible at once means the conditional was accidentally
    // removed; neither visible means the route shell broke.
    expect(formVisible).not.toEqual(fallbackVisible);
  });

  test("feature-disabled fallback has a mailto: anchor (when flag is OFF)", async ({
    schoolsDpa,
  }) => {
    await schoolsDpa.open();
    const fallbackVisible = await schoolsDpa.featureDisabledFallback.isVisible().catch(() => false);
    test.skip(!fallbackVisible, "flag is ON — form is rendered, this branch does not apply");
    const href = await schoolsDpa.featureDisabledMailto.getAttribute("href");
    expect(href).toMatch(/^mailto:/);
    expect(href).toContain("DPA");
  });

  test("form branch exposes all four required fields + Turnstile + submit (when flag is ON)", async ({
    schoolsDpa,
  }) => {
    await schoolsDpa.open();
    const formVisible = await schoolsDpa.form.isVisible().catch(() => false);
    test.skip(!formVisible, "flag is OFF — fallback is rendered, this branch does not apply");
    await expect(schoolsDpa.formName).toBeVisible();
    await expect(schoolsDpa.formEmail).toBeVisible();
    await expect(schoolsDpa.formSchool).toBeVisible();
    await expect(schoolsDpa.formConsent).toBeVisible();
    await expect(schoolsDpa.formTurnstile).toBeVisible();
    await expect(schoolsDpa.formSubmit).toBeVisible();
  });

  test("route is noindex,nofollow (intake page should not show in SERP)", async ({
    docHead,
    schoolsDpa,
  }) => {
    await schoolsDpa.open();
    const robots = await docHead.robotsContent();
    expect(robots).toMatch(/noindex/);
    expect(robots).toMatch(/nofollow/);
  });
});
