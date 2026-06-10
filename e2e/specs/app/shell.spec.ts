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

test.describe("/app shell — authenticated (desktop)", () => {
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

  test("Account link lights up on /app/legal/dsr as well as /app/account/*", async ({ page }) => {
    const shell = new AppShellPage(page);
    await page.goto("/app/legal/dsr");
    // The "Account" sidebar link is active on legacy /legal/dsr routes
    // because they render as tabs under the same surface. Active state is
    // expressed via the `text-primary` class — assert via class match on
    // the locator's resolved className.
    const cls = await shell.sidebarLinkAccountProfile.getAttribute("class");
    expect(cls).toMatch(/text-primary/);
  });

  test("mobile drawer trigger is hidden on desktop", async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.open();
    // The hamburger is `lg:hidden`. Playwright `toBeVisible()` returns
    // false for elements with `display:none`, which is what Tailwind
    // emits at the active breakpoint.
    await expect(shell.mobileTrigger).toBeHidden();
  });
});

test.describe("/app shell — mobile drawer @mobile", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page);
  });

  test("hamburger trigger is visible at mobile viewport", async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.open();
    // Desktop sidebar is `display:none` at <lg; the trigger takes its place.
    await expect(shell.sidebar).toBeHidden();
    await expect(shell.mobileTrigger).toBeVisible();
  });

  test("clicking trigger opens the drawer and reveals the nav", async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.open();
    await shell.mobileTrigger.click();
    await expect(shell.mobileDrawer).toBeVisible();
    await expect(shell.mobileNav).toBeVisible();
    await expect(shell.mobileLinkDashboard).toBeVisible();
    await expect(shell.mobileLinkTests).toBeVisible();
    await expect(shell.mobileLinkTeams).toBeVisible();
    await expect(shell.mobileLinkAccountProfile).toBeVisible();
  });

  test("clicking a drawer link navigates AND auto-closes the drawer", async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.open();
    await shell.mobileTrigger.click();
    await expect(shell.mobileDrawer).toBeVisible();
    await shell.mobileLinkTests.click();
    await expect(page).toHaveURL(/\/app\/tests/);
    // useEffect tied to `loc.pathname` flips `mobileOpen` back to false on
    // any route change — the drawer should unmount.
    await expect(shell.mobileDrawer).toBeHidden();
  });

  test("close button dismisses the drawer without navigating", async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.open();
    await shell.mobileTrigger.click();
    await expect(shell.mobileDrawer).toBeVisible();
    await shell.mobileClose.click();
    await expect(shell.mobileDrawer).toBeHidden();
    await expect(page).toHaveURL(/\/app(\?|$)/);
  });

  test("Escape key closes the drawer (Radix focus-trap contract)", async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.open();
    await shell.mobileTrigger.click();
    await expect(shell.mobileDrawer).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(shell.mobileDrawer).toBeHidden();
  });

  test("drawer logout button is wired and matches the desktop affordance", async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.open();
    await shell.mobileTrigger.click();
    await expect(shell.mobileLogout).toBeVisible();
    await expect(shell.mobileLogout).toBeEnabled();
  });
});

test.describe("/app shell — signout flow (E36 C3)", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page);
  });

  // The "you have been signed out" toast travels across a hard-nav via
  // sessionStorage (window.location.href = "/" wipes in-memory state).
  // signOutAndRedirect writes the flag BEFORE the redirect; the public
  // root mounts <SignedOutFlash /> which consumes the flag once and
  // fires the sonner toast. The contract: after click → land on / with
  // visible Slovak confirmation copy.
  test("clicking the header logout fires signout and surfaces the confirmation toast on /", async ({
    page,
  }) => {
    const shell = new AppShellPage(page);
    await shell.open();
    await expect(shell.headerLogout).toBeVisible();
    await shell.headerLogout.click();
    // Hard-nav to the public homepage.
    await page.waitForURL(/\/(\?|$)/, { timeout: 5_000 });
    // Sonner renders the toast in a portal — the text is the most
    // resilient locator and is the actual user-facing surface.
    await expect(shell.signedOutToast).toBeVisible();
  });

  test("the toast is consumed once — a reload of / does NOT re-fire it", async ({ page }) => {
    const shell = new AppShellPage(page);
    await shell.open();
    await shell.headerLogout.click();
    await page.waitForURL(/\/(\?|$)/, { timeout: 5_000 });
    await expect(shell.signedOutToast).toBeVisible();
    // Wait for the toast to auto-dismiss (Sonner default ~4s), then
    // reload — the flag was consumed so the second mount must not
    // re-trigger.
    await expect(shell.signedOutToast).toHaveCount(0, { timeout: 6_000 });
    await page.reload();
    await expect(shell.signedOutToast).toHaveCount(0);
  });
});
