import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { seedTeam } from "../../seed";
import { AppTeamsPage } from "../../poms/app/AppTeamsPage";

test.describe("/app/teams", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page, {
      tables: {
        teams: [seedTeam({ owner_id: EDUCATOR_SESSION.user.id, name: "E2E Squad" })],
        team_members: [],
      },
    });
  });

  test("renders teams list and invite controls", async ({ page }) => {
    const teams = new AppTeamsPage(page);
    await teams.open();
    await expect(teams.list).toBeVisible();
    await expect(teams.inviteEmailInput).toBeVisible();
    await expect(teams.inviteButton).toBeEnabled();
  });
});
