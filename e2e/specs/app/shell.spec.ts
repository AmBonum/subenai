import { test, expect } from "@playwright/test";
import { AppShellPage } from "../../poms/app/AppShellPage";

// AH-3.1 ships /app/* behind `requireSupabaseAuth`. Until AH-11 wires an
// authenticated-session test fixture, the shell smoke specs are skipped.
// The /login redirect is covered by the integration tests below (it does
// not require an auth session — that is exactly what we are asserting).

test.describe("/app shell — auth gate", () => {
  test("unauthenticated visit to /app redirects to /login", async ({ page }) => {
    await page.goto("/app", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });
});

test.describe("/app shell — authenticated", () => {
  test.skip(true, "AH-11 provides an authenticated-session fixture");

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
