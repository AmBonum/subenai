import { afterAll, describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// VITE_TURNSTILE_SITE_KEY is unset in test env → form sets token to
// "disabled" and accepts submit without a real widget render. Lets us
// exercise the rest of the form without bootstrapping Turnstile JS.

import { SchoolsDpaForm } from "@/components/schools/SchoolsDpaForm";

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

beforeEach(() => {
  vi.restoreAllMocks();
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
});

afterAll(() => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});

const validPdfBase64 = btoa("%PDF-1.4\nstub\n%%EOF");

describe("SchoolsDpaForm", () => {
  it("renders all three fields, consent checkbox, and Turnstile container", () => {
    render(<SchoolsDpaForm />);
    expect(screen.getByTestId("schools-dpa-form")).toBeInTheDocument();
    expect(screen.getByTestId("schools-dpa-form-name")).toBeInTheDocument();
    expect(screen.getByTestId("schools-dpa-form-email")).toBeInTheDocument();
    expect(screen.getByTestId("schools-dpa-form-school")).toBeInTheDocument();
    expect(screen.getByTestId("schools-dpa-form-consent")).toBeInTheDocument();
    expect(screen.getByTestId("schools-dpa-form-turnstile")).toBeInTheDocument();
    expect(screen.getByTestId("schools-dpa-form-submit")).toBeInTheDocument();
  });

  it("submit button is disabled until all fields + consent are valid", async () => {
    const user = userEvent.setup();
    render(<SchoolsDpaForm />);
    const submit = screen.getByTestId("schools-dpa-form-submit") as HTMLButtonElement;
    expect(submit.disabled).toBe(true);

    await user.type(screen.getByTestId("schools-dpa-form-name"), "Jana Nováková");
    expect(submit.disabled).toBe(true);
    await user.type(screen.getByTestId("schools-dpa-form-email"), "jana@skola.sk");
    expect(submit.disabled).toBe(true);
    await user.type(screen.getByTestId("schools-dpa-form-school"), "Gymnázium Zlatá brána");
    // Still disabled — consent not checked.
    expect(submit.disabled).toBe(true);

    await user.click(screen.getByTestId("schools-dpa-form-consent"));
    expect(submit.disabled).toBe(false);
  });

  it("happy path POSTs payload, decodes base64 PDF, triggers download, shows success state", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          requestId: "req-xyz",
          pdfBase64: validPdfBase64,
          fileName: "DPA-subenai-gymnazium-v0.1.pdf",
          templateVersion: "v0.1",
        }),
        { status: 200 },
      ),
    );

    const user = userEvent.setup();
    render(<SchoolsDpaForm />);

    await user.type(screen.getByTestId("schools-dpa-form-name"), "Jana Nováková");
    await user.type(screen.getByTestId("schools-dpa-form-email"), "jana@skola.sk");
    await user.type(screen.getByTestId("schools-dpa-form-school"), "Gymnázium Zlatá brána");
    await user.click(screen.getByTestId("schools-dpa-form-consent"));
    await user.click(screen.getByTestId("schools-dpa-form-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("schools-dpa-form-success")).toBeInTheDocument();
    });
    expect(fetchSpy).toHaveBeenCalledWith("/api/dpa-request", expect.any(Object));
    const call = fetchSpy.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(call.body as string) as Record<string, unknown>;
    expect(body.contact_name).toBe("Jana Nováková");
    expect(body.contact_email).toBe("jana@skola.sk");
    expect(body.school_name).toBe("Gymnázium Zlatá brána");
    expect(body.consent_dpa_processing).toBe(true);
    expect(body.turnstile_token).toBe("disabled");
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("server error surfaces in the live status region with friendly Slovak copy", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "rate_limited" }), { status: 429 }),
    );

    const user = userEvent.setup();
    render(<SchoolsDpaForm />);

    await user.type(screen.getByTestId("schools-dpa-form-name"), "Jana Nováková");
    await user.type(screen.getByTestId("schools-dpa-form-email"), "jana@skola.sk");
    await user.type(screen.getByTestId("schools-dpa-form-school"), "Gymnázium Zlatá brána");
    await user.click(screen.getByTestId("schools-dpa-form-consent"));
    await user.click(screen.getByTestId("schools-dpa-form-submit"));

    const alert = await screen.findByTestId("schools-dpa-form-status");
    expect(alert).toBeInTheDocument();
    expect(alert.textContent).toMatch(/Príliš veľa pokusov/);
  });
});
