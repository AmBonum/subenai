import { BasePage } from "../BasePage";

export class AppTeamsPage extends BasePage {
  static readonly PATH = "/app/teams" as const;

  async open() {
    return this.goto(AppTeamsPage.PATH);
  }

  get root() {
    return this.page.getByTestId("app-teams-root");
  }

  get header() {
    return this.page.getByTestId("app-teams-page-header");
  }

  get list() {
    return this.page.getByTestId("app-teams-list");
  }

  get inviteCard() {
    return this.page.getByTestId("app-teams-invite-card");
  }

  get inviteEmailInput() {
    return this.page.getByTestId("app-teams-invite-email-input");
  }

  get inviteButton() {
    return this.page.getByTestId("app-teams-invite-button");
  }

  get inviteRoleSelect() {
    return this.page.getByTestId("app-teams-invite-role-select");
  }

  get membersList() {
    return this.page.getByTestId("app-teams-members-list");
  }

  get emptyState() {
    return this.page.getByTestId("app-teams-empty-state");
  }

  teamRow(teamId: string) {
    return this.page.getByTestId(`app-teams-row-${teamId}`);
  }

  memberRow(memberId: string) {
    return this.page.getByTestId(`app-teams-member-row-${memberId}`);
  }

  memberRoleSelect(memberId: string) {
    return this.page.getByTestId(`app-teams-member-role-select-${memberId}`);
  }

  memberRemoveButton(memberId: string) {
    return this.page.getByTestId(`app-teams-member-remove-${memberId}`);
  }
}
