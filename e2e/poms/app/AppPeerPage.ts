import { BasePage } from "../BasePage";

export class AppPeerPage extends BasePage {
  static readonly PATH = "/app/peer" as const;

  async open() {
    return this.goto(AppPeerPage.PATH);
  }

  get root() {
    return this.page.getByTestId("app-peer-root");
  }

  get pageHeader() {
    return this.page.getByTestId("app-peer-page-header");
  }

  get emptyInsufficientCard() {
    return this.page.getByTestId("app-peer-empty-cohort");
  }

  get emptyInsufficientBody() {
    return this.page.getByTestId("app-peer-empty-cohort-body");
  }

  get emptyUserCard() {
    return this.page.getByTestId("app-peer-empty-user");
  }

  get emptyUserBody() {
    return this.page.getByTestId("app-peer-empty-user-body");
  }

  get percentileCard() {
    return this.page.getByTestId("app-peer-percentile-card");
  }

  get percentileHeadline() {
    return this.page.getByTestId("app-peer-percentile-headline");
  }

  get percentileBody() {
    return this.page.getByTestId("app-peer-percentile-body");
  }

  get scoresCard() {
    return this.page.getByTestId("app-peer-scores-card");
  }

  get scoreRowUser() {
    return this.page.getByTestId("app-peer-score-row-user");
  }

  get scoreUserValue() {
    return this.page.getByTestId("app-peer-score-user-value");
  }

  get scoreUserBar() {
    return this.page.getByTestId("app-peer-score-user-bar");
  }

  get scoreRowCohort() {
    return this.page.getByTestId("app-peer-score-row-cohort");
  }

  get scoreCohortValue() {
    return this.page.getByTestId("app-peer-score-cohort-value");
  }

  get branchesCard() {
    return this.page.getByTestId("app-peer-branches-card");
  }

  get branchesList() {
    return this.page.getByTestId("app-peer-branches-list");
  }

  branchRow(slug: string) {
    return this.page.getByTestId(`app-peer-branch-row-${slug}`);
  }

  get shareDownloadButton() {
    return this.page.getByTestId("app-peer-share-download");
  }

  get privacyNote() {
    return this.page.getByTestId("app-peer-privacy-note");
  }
}
