import { BasePage } from "../BasePage";

export class AdminFooterPage extends BasePage {
  static readonly PATH = "/admin/footer" as const;

  async open() {
    return this.goto(AdminFooterPage.PATH);
  }

  // ---- Page shell ----------------------------------------------------------

  get formRoot() {
    return this.page.getByTestId("cms-footer-form-root");
  }

  get addColumnButton() {
    return this.page.getByTestId("cms-footer-form-add-column");
  }

  get saveButton() {
    return this.page.getByTestId("cms-footer-form-save");
  }

  get emptyState() {
    return this.page.getByTestId("cms-footer-form-empty");
  }

  /**
   * Sonner success toast after save (portal-rendered, no testid hook) —
   * verbatim Slovak copy is the user-facing contract.
   */
  get savedToast() {
    return this.page.getByText("Päta uložená.");
  }

  // ---- Columns -------------------------------------------------------------

  columnCard(idx: number) {
    return this.page.getByTestId(`cms-footer-column-${idx}`);
  }

  columnTitleInput(idx: number) {
    return this.page.getByTestId(`cms-footer-column-${idx}-title`);
  }

  columnRemoveButton(idx: number) {
    return this.page.getByTestId(`cms-footer-column-${idx}-remove`);
  }

  columnAddLinkButton(idx: number) {
    return this.page.getByTestId(`cms-footer-column-${idx}-add-link`);
  }

  // ---- Links ---------------------------------------------------------------

  linkRow(colIdx: number, linkIdx: number) {
    return this.page.getByTestId(`cms-footer-column-link-${colIdx}-${linkIdx}`);
  }

  linkLabelInput(colIdx: number, linkIdx: number) {
    return this.page.getByTestId(`cms-footer-column-link-${colIdx}-${linkIdx}-label`);
  }

  linkUrlInput(colIdx: number, linkIdx: number) {
    return this.page.getByTestId(`cms-footer-column-link-${colIdx}-${linkIdx}-url`);
  }

  linkRemoveButton(colIdx: number, linkIdx: number) {
    return this.page.getByTestId(`cms-footer-column-link-${colIdx}-${linkIdx}-remove`);
  }

  // ---- Socials -------------------------------------------------------------

  get addSocialButton() {
    return this.page.getByTestId("cms-footer-form-add-social");
  }

  socialRow(idx: number) {
    return this.page.getByTestId(`cms-footer-social-${idx}`);
  }

  socialPlatformInput(idx: number) {
    return this.page.getByTestId(`cms-footer-social-${idx}-platform`);
  }

  socialUrlInput(idx: number) {
    return this.page.getByTestId(`cms-footer-social-${idx}-url`);
  }

  socialRemoveButton(idx: number) {
    return this.page.getByTestId(`cms-footer-social-${idx}-remove`);
  }
}
