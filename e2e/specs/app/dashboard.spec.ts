import { test, expect } from "@playwright/test";
import { AppDashboardPage } from "../../poms/app/AppDashboardPage";

test.describe("/app dashboard", () => {
  test.skip(true, "AH-11 provides an authenticated-session fixture");

  test("renders all four StatCards", async ({ page }) => {
    const dash = new AppDashboardPage(page);
    await dash.open();
    await expect(dash.statTests).toBeVisible();
    await expect(dash.statSessions).toBeVisible();
    await expect(dash.statRespondents).toBeVisible();
    await expect(dash.statCompletion).toBeVisible();
  });
});
