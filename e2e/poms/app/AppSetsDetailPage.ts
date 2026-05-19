import { BasePage } from "../BasePage";

export class AppSetsDetailPage extends BasePage {
  static readonly PATH = (setId: string) => `/app/sets/${setId}` as const;

  async open(setId: string) {
    return this.goto(AppSetsDetailPage.PATH(setId));
  }

  get root() {
    return this.page.getByTestId("set-detail-root");
  }

  get pageHeaderWrapper() {
    return this.page.getByTestId("set-detail-title");
  }

  get pageHeaderTitle() {
    return this.page.getByTestId("set-detail-title").getByTestId("app-shell-page-header-title");
  }

  get backButton() {
    return this.page.getByTestId("set-detail-back-button");
  }

  get notFoundCard() {
    return this.page.getByTestId("set-detail-not-found");
  }

  get notFoundTitle() {
    return this.page.getByTestId("set-detail-not-found-title");
  }

  get notFoundDescription() {
    return this.page.getByTestId("set-detail-not-found-description");
  }

  get correctColumn() {
    return this.page.getByTestId("set-detail-correct-column");
  }

  get incorrectColumn() {
    return this.page.getByTestId("set-detail-incorrect-column");
  }

  correctRow(idx: number) {
    return this.page.getByTestId(`set-detail-correct-row-${idx}`);
  }

  incorrectRow(idx: number) {
    return this.page.getByTestId(`set-detail-incorrect-row-${idx}`);
  }

  async clickBackButton() {
    await this.backButton.click();
  }
}
