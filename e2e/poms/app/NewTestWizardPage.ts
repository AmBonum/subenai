import { BasePage } from "../BasePage";

export class NewTestWizardPage extends BasePage {
  static readonly PATH = "/app/tests/new" as const;

  async open() {
    return this.goto(NewTestWizardPage.PATH);
  }

  get root() {
    return this.page.getByTestId("new-test-wizard-root");
  }

  get progress() {
    return this.page.getByTestId("new-test-wizard-progress");
  }

  stepRoot(n: 1 | 2 | 3 | 4) {
    return this.page.getByTestId(`new-test-wizard-step-${n}-root`);
  }

  stepNext(n: 1 | 2 | 3) {
    return this.page.getByTestId(`new-test-wizard-step-${n}-next`);
  }

  stepBack(n: 2 | 3 | 4) {
    return this.page.getByTestId(`new-test-wizard-step-${n}-back`);
  }

  get titleInput() {
    return this.page.getByTestId("new-test-wizard-title-input");
  }

  get descriptionInput() {
    return this.page.getByTestId("new-test-wizard-description-input");
  }

  get audienceSelect() {
    return this.page.getByTestId("new-test-wizard-audience-select");
  }

  get addQuestionButton() {
    return this.page.getByTestId("new-test-wizard-question-add-button");
  }

  questionRow(idx: number) {
    return this.page.getByTestId(`new-test-wizard-question-row-${idx}`);
  }

  get publishButton() {
    return this.page.getByTestId("new-test-wizard-publish-button");
  }

  get shareLinkInput() {
    return this.page.getByTestId("new-test-wizard-share-link-input");
  }

  get shareCopyButton() {
    return this.page.getByTestId("new-test-wizard-share-copy-button");
  }
}
