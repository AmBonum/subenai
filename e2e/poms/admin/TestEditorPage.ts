import { BasePage } from "../BasePage";

export class AdminTestEditorPage extends BasePage {
  async open(testId: string) {
    return this.goto(`/admin/tests/${testId}`);
  }

  get root() {
    return this.page.getByTestId("admin-test-editor-root");
  }

  get notFound() {
    return this.page.getByTestId("admin-test-editor-not-found");
  }

  get titleInput() {
    return this.page.getByTestId("admin-test-editor-title-input");
  }

  get descriptionInput() {
    return this.page.getByTestId("admin-test-editor-description-input");
  }

  get statusSelect() {
    return this.page.getByTestId("admin-test-editor-status-select");
  }

  get difficultySelect() {
    return this.page.getByTestId("admin-test-editor-difficulty-select");
  }

  get branchSelect() {
    return this.page.getByTestId("admin-test-editor-branch-select");
  }

  get saveButton() {
    return this.page.getByTestId("admin-test-editor-save-button");
  }

  get publishButton() {
    return this.page.getByTestId("admin-test-editor-publish-button");
  }

  get archiveButton() {
    return this.page.getByTestId("admin-test-editor-archive-button");
  }

  get backButton() {
    return this.page.getByTestId("admin-test-editor-back-button");
  }

  get addQuestionButton() {
    return this.page.getByTestId("admin-test-editor-add-question-button");
  }

  questionRow(idx: number) {
    return this.page.getByTestId(`admin-test-editor-question-row-${idx}`);
  }

  questionUp(idx: number) {
    return this.page.getByTestId(`admin-test-editor-question-row-up-${idx}`);
  }

  questionDown(idx: number) {
    return this.page.getByTestId(`admin-test-editor-question-row-down-${idx}`);
  }

  questionRemove(idx: number) {
    return this.page.getByTestId(`admin-test-editor-question-row-remove-${idx}`);
  }
}
