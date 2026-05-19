import { test, expect } from "../../fixtures/base";
import { setupAppShell } from "../../setup/app-shell";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { AppOnboardingPage } from "../../poms/app/AppOnboardingPage";

// `/app/onboarding` runs once per account on first /app entry. The
// `beforeLoad` reads `profile_preferences.onboarded_at` and redirects
// to `/app` when set, so `setupAppShell({ onboarded: false })` is
// required for the form to render at all. Submit + Skip both upsert
// `profile_preferences` and navigate to `/app` on success.

test.describe("/app/onboarding — form renders + happy paths", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupAppShell(context, page, {
      session: EDUCATOR_SESSION,
      onboarded: false,
    });
  });

  test("TC-01: page renders with all fieldsets and no site header", async ({ page }) => {
    const onboarding = new AppOnboardingPage(page);
    await onboarding.open();

    await expect(onboarding.root).toBeVisible();
    await expect(onboarding.heading).toHaveText("Vitaj. Ako môžeme zladiť subenai pre teba?");
    await expect(onboarding.form).toBeVisible();
    await expect(onboarding.q1Group).toBeVisible();
    await expect(onboarding.q2Group).toBeVisible();
    await expect(onboarding.q3Group).toBeVisible();
    await expect(onboarding.submitButton).toBeVisible();
    await expect(onboarding.skipButton).toBeVisible();

    // `staticData.hideSiteHeader = true` should suppress the marketing
    // header — assert it's NOT in the DOM at all.
    await expect(page.locator("header[role='banner']")).toHaveCount(0);
  });

  test("TC-02: audience radio toggles selected state", async ({ page }) => {
    const onboarding = new AppOnboardingPage(page);
    await onboarding.open();

    await onboarding.q1Radio("class").click();
    await expect(onboarding.q1Radio("class")).toHaveAttribute("aria-checked", "true");

    await onboarding.q1Radio("colleagues").click();
    await expect(onboarding.q1Radio("colleagues")).toHaveAttribute("aria-checked", "true");
    await expect(onboarding.q1Radio("class")).toHaveAttribute("aria-checked", "false");
  });

  test("TC-03: submit with answers redirects to /app", async ({ page }) => {
    const onboarding = new AppOnboardingPage(page);
    await onboarding.open();

    await onboarding.q1Radio("class").click();
    await onboarding.q2Checkbox("phishing").click();
    await onboarding.q2Checkbox("deepfake").click();
    await onboarding.submitButton.click();

    await expect(page).toHaveURL(/\/app\/?(\?|$)/);
    await expect(onboarding.errorMessage).toHaveCount(0);
  });

  test("TC-04: skip button redirects to /app", async ({ page }) => {
    const onboarding = new AppOnboardingPage(page);
    await onboarding.open();

    await onboarding.skipButton.click();

    await expect(page).toHaveURL(/\/app\/?(\?|$)/);
    await expect(onboarding.errorMessage).toHaveCount(0);
  });
});

test.describe("/app/onboarding — already-onboarded guard", () => {
  test("TC-05: already-onboarded user redirected to /app on visit", async ({ context, page }) => {
    // `onboarded: true` (default) — beforeLoad reads onboarded_at set,
    // throws redirect to /app before the lazy component mounts.
    await setupAppShell(context, page, {
      session: EDUCATOR_SESSION,
      onboarded: true,
    });

    const onboarding = new AppOnboardingPage(page);
    await onboarding.open();

    await expect(page).toHaveURL(/\/app\/?(\?|$)/);
    await expect(onboarding.root).toHaveCount(0);
  });
});

test.describe("/app/onboarding — upsert failure", () => {
  test("TC-06: postgrest 500 shows i18n error message inline", async ({ context, page }) => {
    // beforeLoad SELECT must still succeed (otherwise the form never
    // mounts), so we can't use `errors: { profile_preferences }` — it
    // would 500 the read too. Instead, register a route that 500s
    // only the upsert (POST). Late-registered routes take precedence
    // over mockSupabase's routes per Playwright's reverse-order rule.
    await setupAppShell(context, page, {
      session: EDUCATOR_SESSION,
      onboarded: false,
    });

    await page.route("**/rest/v1/profile_preferences*", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            code: "internal_error",
            message: "Simulated upsert failure",
            details: null,
            hint: null,
          }),
        });
      } else {
        await route.fallback();
      }
    });

    const onboarding = new AppOnboardingPage(page);
    await onboarding.open();
    await onboarding.submitButton.click();

    await expect(onboarding.errorMessage).toBeVisible();
    await expect(onboarding.errorMessage).toHaveText("Ukladanie zlyhalo. Skús to znovu.");
    await expect(page).toHaveURL(/\/app\/onboarding/);
  });
});
