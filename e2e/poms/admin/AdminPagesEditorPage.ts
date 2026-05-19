import { BasePage } from "../BasePage";

export class AdminPagesEditorPage extends BasePage {
  static path(pageId: string) {
    return `/admin/pages/${pageId}` as const;
  }

  async open(pageId: string) {
    return this.goto(AdminPagesEditorPage.path(pageId));
  }

  get root() {
    return this.page.getByTestId("cms-page-editor-root");
  }

  get notFound() {
    return this.page.getByTestId("cms-page-editor-not-found");
  }

  get backLink() {
    return this.page.getByTestId("cms-page-editor-back");
  }

  get titleInput() {
    return this.page.getByTestId("cms-page-editor-title-input");
  }

  get titleError() {
    return this.page.getByTestId("cms-page-editor-title-error");
  }

  get slugInput() {
    return this.page.getByTestId("cms-page-editor-slug-input");
  }

  get slugError() {
    return this.page.getByTestId("cms-page-editor-slug-error");
  }

  get descriptionInput() {
    return this.page.getByTestId("cms-page-editor-description-input");
  }

  get saveButton() {
    return this.page.getByTestId("cms-page-editor-save");
  }

  get publishButton() {
    return this.page.getByTestId("cms-page-editor-publish");
  }

  get unpublishButton() {
    return this.page.getByTestId("cms-page-editor-unpublish");
  }

  get statusProbe() {
    return this.page.getByTestId("cms-page-editor-status");
  }

  get blocksEmpty() {
    return this.page.getByTestId("cms-page-editor-blocks-empty");
  }

  get blockTypeSelect() {
    return this.page.getByTestId("cms-page-editor-block-type-select");
  }

  get addBlockButton() {
    return this.page.getByTestId("cms-page-editor-add-block");
  }
}
