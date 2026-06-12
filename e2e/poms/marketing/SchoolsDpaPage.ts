import { BasePage } from "../BasePage";

/**
 * /schools/dpa — public DPA intake form route (E40).
 *
 * Two visual states gated by the build-time flag `VITE_DPA_FLOW_ENABLED`:
 *   - flag ON  → `SchoolsDpaForm` rendered (name + email + school + consent
 *     + Turnstile). End user submits → server inserts a `dpa_requests`
 *     row + returns a base64 PDF + queues an e-mail copy.
 *   - flag OFF → `schools-dpa-feature-disabled` fallback section with
 *     a `mailto:` to `kontakt@subenai.sk` so the route never dead-ends
 *     while we wait for legal review of the v0.1 template.
 *
 * Specs use this POM to assert which branch is live + the shared chrome
 * (back-link, heading, intro) without reaching into either internal.
 * The form happy-path itself is NOT exercised end-to-end here — the
 * Turnstile challenge + WASM-backed react-pdf render are tested via
 * `tests/components/schools/SchoolsDpaForm.test.tsx` + the handler-side
 * vitest specs in `tests/functions/`. Keeping E2E off the WASM path
 * avoids browser-CSP flakes when Playwright loads yoga-layout-wasm
 * inside a headless Chromium with different cache headers than prod.
 */
export class SchoolsDpaPage extends BasePage {
  static readonly PATH = "/schools/dpa" as const;

  async open() {
    return this.goto(SchoolsDpaPage.PATH);
  }

  get main() {
    return this.page.getByTestId("schools-dpa-main");
  }
  get backLink() {
    return this.page.getByTestId("schools-dpa-back-link");
  }
  get heading() {
    return this.page.getByTestId("schools-dpa-heading");
  }
  get intro() {
    return this.page.getByTestId("schools-dpa-intro");
  }

  // Feature-flag-ON branch — form
  get form() {
    return this.page.getByTestId("schools-dpa-form");
  }
  get formName() {
    return this.page.getByTestId("schools-dpa-form-name");
  }
  get formEmail() {
    return this.page.getByTestId("schools-dpa-form-email");
  }
  get formSchool() {
    return this.page.getByTestId("schools-dpa-form-school");
  }
  get formConsent() {
    return this.page.getByTestId("schools-dpa-form-consent");
  }
  get formTurnstile() {
    return this.page.getByTestId("schools-dpa-form-turnstile");
  }
  get formSubmit() {
    return this.page.getByTestId("schools-dpa-form-submit");
  }

  // Error state (role=alert, shown on submit failure)
  get formStatus() {
    return this.page.getByTestId("schools-dpa-form-status");
  }

  // Success state
  get formSuccess() {
    return this.page.getByTestId("schools-dpa-form-success");
  }

  // Feature-flag-OFF branch — fallback
  get featureDisabledFallback() {
    return this.page.getByTestId("schools-dpa-feature-disabled");
  }
  get featureDisabledMailto() {
    return this.page.getByTestId("schools-dpa-feature-disabled-mailto");
  }

  async fillForm(opts: { name: string; email: string; school: string }): Promise<void> {
    await this.formName.fill(opts.name);
    await this.formEmail.fill(opts.email);
    await this.formSchool.fill(opts.school);
    await this.formConsent.check();
  }
}
