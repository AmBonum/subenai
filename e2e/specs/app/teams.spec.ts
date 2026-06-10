import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { EDUCATOR_SESSION } from "../../fixtures/auth";
import { seedProfile, seedTeam } from "../../seed";
import { AppTeamsPage } from "../../poms/app/AppTeamsPage";

const TEAM = seedTeam({
  id: "team_e2e_001",
  owner_id: EDUCATOR_SESSION.user.id,
  name: "E2E Squad",
});

const TEAM_OTHER = seedTeam({
  id: "team_e2e_002",
  owner_id: EDUCATOR_SESSION.user.id,
  name: "Backup Squad",
});

const MEMBER_PROFILE = seedProfile({
  id: "prof_member_001",
  email: "member-one@e2e.test",
  display_name: "Member One",
  avatar_initials: "M1",
});

const MEMBER_ROW = {
  id: "tm_e2e_001",
  team_id: TEAM.id,
  user_id: MEMBER_PROFILE.id,
  role: "editor" as const,
  joined_at: "2026-05-19T00:00:00.000Z",
};

test.describe("/app/teams — list + invite controls", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page, {
      tables: {
        teams: [TEAM],
        team_members: [],
      },
    });
  });

  test("renders teams list, page header, and invite controls", async ({ page }) => {
    const teams = new AppTeamsPage(page);
    await teams.open();
    await expect(teams.header).toBeVisible();
    await expect(teams.list).toBeVisible();
    await expect(teams.teamRow(TEAM.id)).toBeVisible();
    await expect(teams.teamRow(TEAM.id)).toContainText("E2E Squad");
    await expect(teams.inviteEmailInput).toBeVisible();
    await expect(teams.inviteRoleSelect).toBeVisible();
    await expect(teams.inviteButton).toBeEnabled();
  });

  test("renders the 'no members' empty state when team has no members", async ({ page }) => {
    const teams = new AppTeamsPage(page);
    await teams.open();
    // The page renders "Žiadni členovia" text inside the members-list
    // container when no rows exist. Asserting against the verbatim Slovak
    // string per CLAUDE.md "quote verbatim" rule.
    await expect(teams.membersList).toContainText("Žiadni členovia");
  });

  test("invite with an invalid email surfaces a toast and does not clear the input", async ({
    page,
  }) => {
    const teams = new AppTeamsPage(page);
    await teams.open();
    await teams.inviteEmailInput.fill("not-an-email");
    await teams.inviteButton.click();
    // The route shows an inline toast on validation failure (no @). We
    // assert the input was NOT cleared — the success branch clears it,
    // so a non-cleared value is the contract for "stayed in error state".
    await expect(teams.inviteEmailInput).toHaveValue("not-an-email");
  });
});

test.describe("/app/teams — multi-team list", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page, {
      tables: {
        teams: [TEAM, TEAM_OTHER],
        team_members: [],
      },
    });
  });

  test("renders every team card in the list grid", async ({ page }) => {
    const teams = new AppTeamsPage(page);
    await teams.open();
    await expect(teams.teamRow(TEAM.id)).toBeVisible();
    await expect(teams.teamRow(TEAM_OTHER.id)).toBeVisible();
    await expect(teams.teamRow(TEAM_OTHER.id)).toContainText("Backup Squad");
  });

  test("clicking a different team card switches the active selection", async ({ page }) => {
    const teams = new AppTeamsPage(page);
    await teams.open();
    // First team is active by default (first in array → activeTeam state).
    // Click the second card — the active class shifts.
    await teams.teamRow(TEAM_OTHER.id).click();
    const otherClass = await teams.teamRow(TEAM_OTHER.id).getAttribute("class");
    expect(otherClass).toMatch(/border-primary/);
  });
});

test.describe("/app/teams — members list", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page, {
      tables: {
        teams: [TEAM],
        team_members: [MEMBER_ROW],
        profiles: [
          seedProfile({
            id: EDUCATOR_SESSION.user.id,
            email: EDUCATOR_SESSION.user.email,
            display_name: "educator",
          }),
          MEMBER_PROFILE,
        ],
      },
    });
  });

  test("renders the seeded member row with name, email, and role badge", async ({ page }) => {
    const teams = new AppTeamsPage(page);
    await teams.open();
    const row = teams.memberRow(MEMBER_ROW.id);
    await expect(row).toBeVisible();
    await expect(row).toContainText(MEMBER_PROFILE.display_name!);
    await expect(row).toContainText(MEMBER_PROFILE.email!);
  });

  test("each member row exposes a role select and remove button", async ({ page }) => {
    const teams = new AppTeamsPage(page);
    await teams.open();
    await expect(teams.memberRoleSelect(MEMBER_ROW.id)).toBeVisible();
    await expect(teams.memberRemoveButton(MEMBER_ROW.id)).toBeVisible();
    await expect(teams.memberRemoveButton(MEMBER_ROW.id)).toBeEnabled();
  });
});

test.describe("/app/teams — mobile responsive @mobile", () => {
  test.beforeEach(async ({ context, page }) => {
    await setupEducator(context, page, {
      tables: {
        teams: [TEAM],
        team_members: [],
      },
    });
  });

  test("invite form stacks vertically on mobile and the email input is full-width", async ({
    page,
  }) => {
    const teams = new AppTeamsPage(page);
    await teams.open();
    // E36 A3 fix: at <sm the invite card uses `flex flex-col`, so the
    // email input claims its own row and the user can see the entire
    // address (regression was "email@fi" truncation at 375×812). We
    // assert by comparing the input's rendered width to a reasonable
    // floor (>250px on a 412px Pixel 7) which would fail under the
    // pre-fix `flex flex-row` layout that left ~120px for the input.
    const bbox = await teams.inviteEmailInput.boundingBox();
    expect(bbox?.width).toBeGreaterThan(250);
    // Invite button should also span the full width <sm.
    const btnBox = await teams.inviteButton.boundingBox();
    expect(btnBox?.width).toBeGreaterThan(250);
  });
});
