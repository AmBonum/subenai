import { BasePage } from "../BasePage";

export class AnswerSetEditorPage extends BasePage {
  static path(setId: string) {
    return `/admin/answer-sets/${setId}` as const;
  }

  async open(setId: string) {
    return this.goto(AnswerSetEditorPage.path(setId));
  }

  get root() {
    return this.page.getByTestId("answer-set-editor-root");
  }

  get backButton() {
    return this.page.getByTestId("answer-set-editor-back-button");
  }

  get addAnswerButton() {
    return this.page.getByTestId("answer-set-editor-add-answer-button");
  }

  get editMetaButton() {
    return this.page.getByTestId("answer-set-editor-edit-meta-button");
  }

  get deleteSetButton() {
    return this.page.getByTestId("answer-set-editor-delete-set-button");
  }

  get correctColumn() {
    return this.page.getByTestId("answer-set-editor-correct-column");
  }

  get incorrectColumn() {
    return this.page.getByTestId("answer-set-editor-incorrect-column");
  }

  correctAddButton() {
    return this.page.getByTestId("answer-set-editor-correct-add-button");
  }

  incorrectAddButton() {
    return this.page.getByTestId("answer-set-editor-incorrect-add-button");
  }

  correctRow(idx: number) {
    return this.page.getByTestId(`answer-set-editor-correct-row-${idx}`);
  }

  incorrectRow(idx: number) {
    return this.page.getByTestId(`answer-set-editor-incorrect-row-${idx}`);
  }

  correctRowInput(idx: number) {
    return this.page.getByTestId(`answer-set-editor-correct-row-input-${idx}`);
  }

  incorrectRowInput(idx: number) {
    return this.page.getByTestId(`answer-set-editor-incorrect-row-input-${idx}`);
  }

  correctRowDelete(idx: number) {
    return this.page.getByTestId(`answer-set-editor-correct-row-delete-${idx}`);
  }

  incorrectRowDelete(idx: number) {
    return this.page.getByTestId(`answer-set-editor-incorrect-row-delete-${idx}`);
  }

  get titleInput() {
    return this.page.getByTestId("answer-set-editor-title-input");
  }

  get saveButton() {
    return this.page.getByTestId("answer-set-editor-save-button");
  }

  get questionsLink() {
    return this.page.getByTestId("answer-set-editor-questions-link");
  }

  get notFound() {
    return this.page.getByTestId("answer-set-detail-not-found");
  }
}
