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

describe("SupportContactForm — E48.2 attachment picker", () => {
  function setupWithAttachments() {
    const onAttachmentUpload = vi.fn().mockResolvedValue({ ok: true });
    const onSubmit = vi.fn().mockResolvedValue({ ticketId: "tkt-123", viewToken: "a".repeat(64) });
    const utils = render(
      <SupportContactForm
        variant="public"
        onSubmit={onSubmit}
        onAttachmentUpload={onAttachmentUpload}
      />,
    );
    return { onSubmit, onAttachmentUpload, ...utils };
  }

  it("does not render the file picker when onAttachmentUpload is omitted", () => {
    setup();
    expect(screen.queryByTestId("kontakt-form-attachments")).toBeNull();
  });

  it("renders the file picker when onAttachmentUpload is provided", () => {
    setupWithAttachments();
    expect(screen.getByTestId("kontakt-form-attachments")).toBeInTheDocument();
    expect(screen.getByTestId("kontakt-form-attachments-input")).toBeInTheDocument();
  });

  it("lists a picked file and lets the user remove it", async () => {
    const user = userEvent.setup();
    setupWithAttachments();
    const input = screen.getByTestId("kontakt-form-attachments-input") as HTMLInputElement;
    const file = new File(["png-bytes"], "photo.png", { type: "image/png" });
    await user.upload(input, file);

    expect(screen.getByTestId("kontakt-form-attachment-0")).toBeInTheDocument();
    expect(screen.getByText("photo.png")).toBeInTheDocument();

    await user.click(screen.getByTestId("kontakt-form-attachment-0-remove"));
    expect(screen.queryByTestId("kontakt-form-attachment-0")).toBeNull();
  });

  it("rejects files larger than 5 MB with a friendly error", async () => {
    const user = userEvent.setup();
    setupWithAttachments();
    const input = screen.getByTestId("kontakt-form-attachments-input") as HTMLInputElement;
    // Construct a 6 MB blob — Node's File supports large sizes.
    const big = new File([new Uint8Array(6 * 1024 * 1024)], "huge.png", { type: "image/png" });
    await user.upload(input, big);

    expect(screen.getByTestId("kontakt-form-attachments-error")).toHaveTextContent(/5 MB/);
    expect(screen.queryByTestId("kontakt-form-attachment-0")).toBeNull();
  });

  it("rejects files with unsupported MIME (GIF) before any upload", async () => {
    const user = userEvent.setup();
    setupWithAttachments();
    const input = screen.getByTestId("kontakt-form-attachments-input") as HTMLInputElement;
    const gif = new File(["gif"], "anim.gif", { type: "image/gif" });
    // user.upload v14+ respects accept attribute and silently filters
    // non-matching files at the input layer — verify the file never
    // makes it into the list. That's defence-in-depth: the browser
    // file dialog already filters via `accept`, and the server-side
    // sanitiser rejects MIME mismatches as well.
    await user.upload(input, gif);
    expect(screen.queryByTestId("kontakt-form-attachment-0")).toBeNull();
  });

  it("caps the picker at 3 files", async () => {
    const user = userEvent.setup();
    setupWithAttachments();
    const input = screen.getByTestId("kontakt-form-attachments-input") as HTMLInputElement;
    const f1 = new File(["a"], "a.png", { type: "image/png" });
    const f2 = new File(["b"], "b.png", { type: "image/png" });
    const f3 = new File(["c"], "c.png", { type: "image/png" });
    const f4 = new File(["d"], "d.png", { type: "image/png" });
    await user.upload(input, [f1, f2, f3, f4]);

    // First 3 are accepted; 4th triggers the cap error.
    expect(screen.getByTestId("kontakt-form-attachment-0")).toBeInTheDocument();
    expect(screen.getByTestId("kontakt-form-attachment-1")).toBeInTheDocument();
    expect(screen.getByTestId("kontakt-form-attachment-2")).toBeInTheDocument();
    expect(screen.queryByTestId("kontakt-form-attachment-3")).toBeNull();
    expect(screen.getByTestId("kontakt-form-attachments-error")).toHaveTextContent(/Maximum/);
  });

  it("calls onAttachmentUpload once per selected file after submit", async () => {
    const user = userEvent.setup();
    const { onAttachmentUpload } = setupWithAttachments();

    // Fill form
    await user.type(screen.getByTestId("kontakt-form-subject-input"), validData.subject);
    await user.click(screen.getByTestId("kontakt-form-category-select"));
    await user.click(await screen.findByTestId("kontakt-form-category-option-question"));
    await user.type(screen.getByTestId("kontakt-form-body-textarea"), validData.body);
    await user.type(screen.getByTestId("kontakt-form-email-input"), validData.email);
    await user.type(screen.getByTestId("kontakt-form-name-input"), validData.name);

    // Pick 2 attachments
    const input = screen.getByTestId("kontakt-form-attachments-input") as HTMLInputElement;
    const f1 = new File(["png1"], "one.png", { type: "image/png" });
    const f2 = new File(["pdf1"], "two.pdf", { type: "application/pdf" });
    await user.upload(input, [f1, f2]);

    // Submit
    await user.click(screen.getByTestId("kontakt-form-submit-button"));

    await waitFor(() => expect(onAttachmentUpload).toHaveBeenCalledTimes(2));
    expect(onAttachmentUpload.mock.calls[0][0].name).toBe("one.png");
    expect(onAttachmentUpload.mock.calls[1][0].name).toBe("two.pdf");
    // Second arg is the ticket result.
    expect(onAttachmentUpload.mock.calls[0][1]).toMatchObject({
      ticketId: "tkt-123",
      viewToken: expect.any(String),
    });
  });

  it("renders per-file error inline when onAttachmentUpload reports failure", async () => {
    const user = userEvent.setup();
    const onAttachmentUpload = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "Súbor je príliš veľký" });
    const onSubmit = vi.fn().mockResolvedValue({ ticketId: "tkt-fail", viewToken: "b".repeat(64) });
    render(
      <SupportContactForm
        variant="public"
        onSubmit={onSubmit}
        onAttachmentUpload={onAttachmentUpload}
      />,
    );

    await user.type(screen.getByTestId("kontakt-form-subject-input"), validData.subject);
    await user.click(screen.getByTestId("kontakt-form-category-select"));
    await user.click(await screen.findByTestId("kontakt-form-category-option-question"));
    await user.type(screen.getByTestId("kontakt-form-body-textarea"), validData.body);
    await user.type(screen.getByTestId("kontakt-form-email-input"), validData.email);
    await user.type(screen.getByTestId("kontakt-form-name-input"), validData.name);

    const input = screen.getByTestId("kontakt-form-attachments-input") as HTMLInputElement;
    await user.upload(input, new File(["x"], "fail.png", { type: "image/png" }));

    await user.click(screen.getByTestId("kontakt-form-submit-button"));

    await waitFor(() =>
      expect(screen.getByTestId("kontakt-form-attachment-0-error")).toHaveTextContent(
        /príliš veľký/i,
      ),
    );
  });
});
