import { test, expect } from "@playwright/test";
import { AppTeamsPage } from "../../poms/app/AppTeamsPage";

test.describe("/app/teams", () => {
  test.skip(true, "AH-11 provides an authenticated-session fixture");

  test("renders teams list and invite controls", async ({ page }) => {
    const teams = new AppTeamsPage(page);
    await teams.open();
    await expect(teams.list).toBeVisible();
    await expect(teams.inviteEmailInput).toBeVisible();
    await expect(teams.inviteButton).toBeEnabled();
  });
});
