import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SupportContactForm } from "@/components/support/SupportContactForm";

// E48.3 component test — Slovak labels, accessibility, validation,
// honeypot positioning, submit flow. Pure presentational test (no
// network; onSubmit is a vi.fn).

const validData = {
  subject: "Test subject",
  category: "question",
  body: "This is a test message body that is long enough.",
  email: "user@example.com",
  name: "Test User",
};

function setup(overrides: Partial<React.ComponentProps<typeof SupportContactForm>> = {}) {
  const onSubmit = vi.fn().mockResolvedValue({ ticketId: "t-test-123" });
  const utils = render(<SupportContactForm variant="public" onSubmit={onSubmit} {...overrides} />);
  return { onSubmit, ...utils };
}

describe("SupportContactForm — Slovak labels + a11y", () => {
  it("renders the seven category options with Slovak labels", () => {
    setup();
    // shadcn Select renders a native <select> + <option> in jsdom-friendly
    // environments, so options are queryable in the DOM without expanding
    // the trigger. In Playwright we'd interact with the popover instead.
    const expected = [
      "Chyba alebo problém",
      "Otázka",
      "Návrh na vylepšenie",
      "Nahlásenie nevhodného obsahu",
      "Platby / sponzorstvo",
      "Žiadosť o údaje (GDPR)",
      "Iné",
    ];
    for (const label of expected) {
      // getAllByText because some shadcn variants render label text twice
      // (the visible Select item + the aria-hidden ItemText). Just assert
      // at least one node carries the Slovak label.
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("subject input is programmatically labelled and required-flagged", () => {
    setup();
    const subject = screen.getByTestId("kontakt-form-subject-input");
    expect(subject).toHaveAttribute("aria-required", "true");
    // Label-input association: input id matches label htmlFor
    const id = subject.getAttribute("id");
    expect(id).toBeTruthy();
    expect(document.querySelector(`label[for="${id}"]`)).toBeInTheDocument();
  });

  it("body has a live char counter and starts at 5000", () => {
    setup();
    const counter = screen.getByTestId("kontakt-form-body-counter");
    expect(counter).toHaveTextContent("Zostáva 5000 znakov");
    expect(counter).toHaveAttribute("aria-live", "polite");
  });

  it("honeypot is rendered, off-screen, tabindex=-1, aria-hidden", () => {
    setup();
    const honeypot = screen.getByTestId("kontakt-form-honeypot");
    expect(honeypot).toHaveAttribute("tabindex", "-1");
    expect(honeypot).toHaveAttribute("autocomplete", "off");
    // Container is aria-hidden + positioned off-screen
    const container = honeypot.closest("[aria-hidden='true']");
    expect(container).not.toBeNull();
    expect(container).toHaveStyle({ position: "absolute", left: "-9999px" });
  });
});

describe("SupportContactForm — validation", () => {
  it("blocks submit and surfaces errors when required fields are missing", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.click(screen.getByTestId("kontakt-form-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("kontakt-form-error-subject")).toHaveTextContent(
        "Téma je povinná.",
      );
    });
    expect(screen.getByTestId("kontakt-form-error-body")).toHaveTextContent("Správa je povinná.");
    expect(screen.getByTestId("kontakt-form-error-email")).toHaveTextContent("E-mail je povinný.");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects malformed e-mail with a Slovak error message", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.type(screen.getByTestId("kontakt-form-subject-input"), validData.subject);
    await user.type(screen.getByTestId("kontakt-form-body-textarea"), validData.body);
    await user.type(screen.getByTestId("kontakt-form-email-input"), "not-an-email");
    await user.click(screen.getByTestId("kontakt-form-category-select"));
    await user.click(await screen.findByTestId("kontakt-form-category-option-question"));
    await user.click(screen.getByTestId("kontakt-form-submit-button"));
    await waitFor(() => {
      expect(screen.getByTestId("kontakt-form-error-email")).toHaveTextContent(
        "Zadajte platný e-mail.",
      );
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects honeypot non-empty submission", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.type(screen.getByTestId("kontakt-form-subject-input"), validData.subject);
    await user.type(screen.getByTestId("kontakt-form-body-textarea"), validData.body);
    await user.type(screen.getByTestId("kontakt-form-email-input"), validData.email);
    await user.click(screen.getByTestId("kontakt-form-category-select"));
    await user.click(await screen.findByTestId("kontakt-form-category-option-question"));
    // Filled honeypot — would only happen from a bot
    const honeypot = screen.getByTestId("kontakt-form-honeypot");
    await user.type(honeypot, "https://spam.example.com");
    await user.click(screen.getByTestId("kontakt-form-submit-button"));
    await waitFor(() => {
      // Honeypot has max=0 so any text triggers the validator
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it("calls onSubmit with the full payload when the form is valid", async () => {
    const user = userEvent.setup();
    const { onSubmit } = setup();
    await user.type(screen.getByTestId("kontakt-form-subject-input"), validData.subject);
    await user.type(screen.getByTestId("kontakt-form-body-textarea"), validData.body);
    await user.type(screen.getByTestId("kontakt-form-email-input"), validData.email);
    await user.type(screen.getByTestId("kontakt-form-name-input"), validData.name);
    await user.click(screen.getByTestId("kontakt-form-category-select"));
    await user.click(await screen.findByTestId("kontakt-form-category-option-question"));
    await user.click(screen.getByTestId("kontakt-form-submit-button"));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    const payload = onSubmit.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      subject: validData.subject,
      category: "question",
      body: validData.body,
      email: validData.email,
      name: validData.name,
      _h_addr: "",
    });
  });
});

describe("SupportContactForm — authenticated variant", () => {
  it("pre-fills email + name and renders them read-only", () => {
    setup({
      variant: "authenticated",
      prefill: { email: "audit-bot@subenai.test", name: "Audit Bot" },
    });
    const email = screen.getByTestId("kontakt-form-email-input") as HTMLInputElement;
    const name = screen.getByTestId("kontakt-form-name-input") as HTMLInputElement;
    expect(email.value).toBe("audit-bot@subenai.test");
    expect(name.value).toBe("Audit Bot");
    expect(email).toHaveAttribute("readonly");
    expect(name).toHaveAttribute("readonly");
  });

  it("does not render the Turnstile slot when authenticated", () => {
    setup({
      variant: "authenticated",
      turnstileSlot: <div data-testid="fake-turnstile-widget">turnstile</div>,
    });
    expect(screen.queryByTestId("kontakt-form-turnstile-slot")).toBeNull();
  });

  it("renders the Turnstile slot when public variant + slot provided", () => {
    setup({
      turnstileSlot: <div data-testid="fake-turnstile-widget">turnstile</div>,
    });
    expect(screen.getByTestId("kontakt-form-turnstile-slot")).toBeInTheDocument();
  });
});
