import type { Locator } from "@playwright/test";

import { BasePage } from "../BasePage";

/**
 * Public kontakt page POM (`/kontakt`). Covers the anonymous + authenticated
 * variants of the SupportContactForm. The Turnstile widget is rendered by
 * the form when the public variant is active — specs mock Turnstile at the
 * network layer so the widget doesn't have to actually validate.
 */
export class KontaktPage extends BasePage {
  static readonly PATH = "/contact-form" as const;

  get root(): Locator {
    return this.page.getByTestId("kontakt-page-root");
  }

  get heading(): Locator {
    return this.page.getByTestId("kontakt-heading");
  }

  get form(): Locator {
    return this.page.getByTestId("kontakt-form");
  }

  // Form fields ---------------------------------------------------------
  get subjectInput(): Locator {
    return this.page.getByTestId("kontakt-form-subject-input");
  }

  get categorySelect(): Locator {
    return this.page.getByTestId("kontakt-form-category-select");
  }

  get bodyTextarea(): Locator {
    return this.page.getByTestId("kontakt-form-body-textarea");
  }

  get bodyCounter(): Locator {
    return this.page.getByTestId("kontakt-form-body-counter");
  }

  get emailInput(): Locator {
    return this.page.getByTestId("kontakt-form-email-input");
  }

  get nameInput(): Locator {
    return this.page.getByTestId("kontakt-form-name-input");
  }

  get submitButton(): Locator {
    return this.page.getByTestId("kontakt-form-submit-button");
  }

  // Error states --------------------------------------------------------
  get subjectError(): Locator {
    return this.page.getByTestId("kontakt-form-error-subject");
  }

  get categoryError(): Locator {
    return this.page.getByTestId("kontakt-form-error-category");
  }

  get bodyError(): Locator {
    return this.page.getByTestId("kontakt-form-error-body");
  }

  get emailError(): Locator {
    return this.page.getByTestId("kontakt-form-error-email");
  }

  get submitError(): Locator {
    return this.page.getByTestId("kontakt-form-submit-error");
  }

  // Success state -------------------------------------------------------
  get successState(): Locator {
    return this.page.getByTestId("kontakt-success-state");
  }

  get successTicketId(): Locator {
    return this.page.getByTestId("kontakt-success-ticket-id");
  }

  // Actions -------------------------------------------------------------
  async open(): Promise<void> {
    await this.goto(KontaktPage.PATH);
    await this.root.waitFor({ state: "visible" });
  }

  async fillAndSubmit(opts: {
    subject: string;
    category: string;
    body: string;
    email: string;
    name?: string;
  }): Promise<void> {
    await this.subjectInput.fill(opts.subject);
    await this.categorySelect.selectOption(opts.category);
    await this.bodyTextarea.fill(opts.body);
    await this.emailInput.fill(opts.email);
    if (opts.name) await this.nameInput.fill(opts.name);
    await this.submitButton.click();
  }
}
