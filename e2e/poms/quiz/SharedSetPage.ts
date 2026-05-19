import { BasePage } from "../BasePage";

export class SharedSetPage extends BasePage {
  static readonly BASE_PATH = "/test/zostava" as const;

  static pathFor(id: string) {
    return `${SharedSetPage.BASE_PATH}/${id}` as const;
  }

  static vysledkyPathFor(id: string) {
    return `${SharedSetPage.BASE_PATH}/${id}/vysledky` as const;
  }

  // --- landing page (non-edu, collects_responses = false) ---

  get page_() {
    return this.page.getByTestId("shared-set-page");
  }

  get heading() {
    return this.page.getByTestId("shared-set-heading");
  }

  get questionCount() {
    return this.page.getByTestId("shared-set-question-count");
  }

  get startButton() {
    return this.page.getByTestId("shared-set-start-button");
  }

  // --- not-found state ---

  get notFoundHeading() {
    return this.page.getByTestId("shared-set-not-found-heading");
  }

  get notFoundBody() {
    return this.page.getByTestId("shared-set-not-found-body");
  }

  // --- /vysledky auth gate ---

  get vysledkyAuthGate() {
    return this.page.getByTestId("vysledky-auth-gate");
  }

  get vysledkyGateHeading() {
    return this.page.getByTestId("vysledky-gate-heading");
  }

  get vysledkyGatePasswordInput() {
    return this.page.getByTestId("vysledky-gate-password-input");
  }

  get vysledkyDashboard() {
    return this.page.getByTestId("vysledky-dashboard");
  }

  // --- actions ---

  async open(id: string) {
    return this.goto(SharedSetPage.pathFor(id));
  }

  async openVysledky(id: string) {
    return this.goto(SharedSetPage.vysledkyPathFor(id));
  }

  async clickStart() {
    await this.startButton.click();
  }
}
