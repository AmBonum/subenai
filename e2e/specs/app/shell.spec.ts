import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { AppShellPage } from "../../poms/app/AppShellPage";

// /app/* sits behind `requireSupabaseAuth({ requireOnboarded: true })`.
// The unauthenticated → /login redirect is fixture-free; the authenticated
// shell checks rely on the Phase 1 auth + Supabase mocks.

test.describe("/app shell — auth gate", () => {
  test("unauthenticated visit to /app redirects to /login", async ({ page }) => {
    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });
});

test.describe("/app shell — authenticated", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page);
  });

  test("sidebar renders all primary nav links", async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.open();
    await expect(shell.sidebar).toBeVisible();
    await expect(shell.sidebarLinkDashboard).toBeVisible();
    await expect(shell.sidebarLinkTests).toBeVisible();
    await expect(shell.sidebarLinkTeams).toBeVisible();
    await expect(shell.sidebarLinkNotifications).toBeVisible();
    await expect(shell.sidebarLinkAccountProfile).toBeVisible();
  });

  test("clicking the tests sidebar link navigates to /app/tests", async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.open();
    await shell.sidebarLinkTests.click();
    await expect(page).toHaveURL(/\/app\/tests/);
  });
});
