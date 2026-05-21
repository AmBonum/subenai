import { afterAll, describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock the lazy-loaded PDF renderer so vitest doesn't try to pull
// @react-pdf/renderer into the test runtime. The form just calls
// renderDpaPdfBlob(...) — we replace it with a 1-byte stub blob.
vi.mock("@/lib/dpa/render.client", () => ({
  renderDpaPdfBlob: vi.fn(async () => new Blob(["%PDF-1.4 stub"], { type: "application/pdf" })),
}));

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

  it("happy path POSTs payload, renders PDF client-side, posts to email handler, shows success-with-email", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = typeof url === "string" ? url : (url as Request).url;
      if (u.includes("/api/dpa-request")) {
        return new Response(
          JSON.stringify({
            ok: true,
            requestId: "11111111-2222-3333-4444-555555555555",
            fileName: "DPA-subenai-gymnazium-v0.1.pdf",
            templateVersion: "v0.1",
            generatedAt: new Date().toISOString(),
          }),
          { status: 200 },
        );
      }
      if (u.includes("/api/dpa-email-attach")) {
        return new Response(JSON.stringify({ ok: true, messageId: "msg-1" }), { status: 200 });
      }
      return new Response("unstubbed", { status: 500 });
    });

    const user = userEvent.setup();
    render(<SchoolsDpaForm />);

    await user.type(screen.getByTestId("schools-dpa-form-name"), "Jana Nováková");
    await user.type(screen.getByTestId("schools-dpa-form-email"), "jana@skola.sk");
    await user.type(screen.getByTestId("schools-dpa-form-school"), "Gymnázium Zlatá brána");
    await user.click(screen.getByTestId("schools-dpa-form-consent"));
    await user.click(screen.getByTestId("schools-dpa-form-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("schools-dpa-form-success-with-email")).toBeInTheDocument();
    });
    const requestCall = fetchSpy.mock.calls.find((c) => String(c[0]).includes("/api/dpa-request"));
    expect(requestCall).toBeTruthy();
    const requestBody = JSON.parse((requestCall![1] as RequestInit).body as string) as Record<
      string,
      unknown
    >;
    expect(requestBody.contact_name).toBe("Jana Nováková");
    expect(requestBody.contact_email).toBe("jana@skola.sk");
    expect(requestBody.school_name).toBe("Gymnázium Zlatá brána");
    expect(requestBody.consent_dpa_processing).toBe(true);

    const emailCall = fetchSpy.mock.calls.find((c) =>
      String(c[0]).includes("/api/dpa-email-attach"),
    );
    expect(emailCall, "form should POST to email handler after download").toBeTruthy();
    const emailBody = JSON.parse((emailCall![1] as RequestInit).body as string) as Record<
      string,
      unknown
    >;
    expect(emailBody.requestId).toBe("11111111-2222-3333-4444-555555555555");
    expect(emailBody.fileName).toBe("DPA-subenai-gymnazium-v0.1.pdf");
    expect(typeof emailBody.pdfBase64).toBe("string");
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("e-mail failure does not roll back the download — success-no-email state shows", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = typeof url === "string" ? url : (url as Request).url;
      if (u.includes("/api/dpa-request")) {
        return new Response(
          JSON.stringify({
            ok: true,
            requestId: "22222222-3333-4444-5555-666666666666",
            fileName: "DPA-subenai-test-v0.1.pdf",
            templateVersion: "v0.1",
            generatedAt: new Date().toISOString(),
          }),
          { status: 200 },
        );
      }
      if (u.includes("/api/dpa-email-attach")) {
        return new Response(JSON.stringify({ error: "send_failed" }), { status: 502 });
      }
      return new Response("unstubbed", { status: 500 });
    });

    const user = userEvent.setup();
    render(<SchoolsDpaForm />);

    await user.type(screen.getByTestId("schools-dpa-form-name"), "Jana Nováková");
    await user.type(screen.getByTestId("schools-dpa-form-email"), "jana@skola.sk");
    await user.type(screen.getByTestId("schools-dpa-form-school"), "Gymnázium Zlatá brána");
    await user.click(screen.getByTestId("schools-dpa-form-consent"));
    await user.click(screen.getByTestId("schools-dpa-form-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("schools-dpa-form-success-no-email")).toBeInTheDocument();
    });
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it("stale chunk hash (rolling deploy mid-submit) → partial-success UI, not scary render_failed", async () => {
    // Repro of the 2026-05-21 production incident: user opened the
    // page during deploy N, submitted after deploy N+1 rolled out, so
    // the lazy `import("@/lib/dpa/render.client")` resolved to the
    // SPA HTML fallback instead of the JS chunk → browser throws
    // `TypeError: Failed to fetch dynamically imported module`.
    // We can't reproduce the import-time failure under vitest's
    // module cache, so we simulate the equivalent post-import path:
    // throw the EXACT same TypeError from inside renderDpaPdfBlob.
    // The detector `isStaleChunkError` matches on the message string,
    // so the partial-success branch and reload CTA fire identically.
    const renderModule = await import("@/lib/dpa/render.client");
    vi.mocked(renderModule.renderDpaPdfBlob).mockImplementationOnce(async () => {
      throw new TypeError(
        "Failed to fetch dynamically imported module: https://subenai.sk/assets/render.client-r9f45IhY.js",
      );
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = typeof url === "string" ? url : (url as Request).url;
      if (u.includes("/api/dpa-request")) {
        return new Response(
          JSON.stringify({
            ok: true,
            requestId: "stale-chunk-row-1",
            fileName: "DPA-subenai-stale-v0.1.pdf",
            templateVersion: "v0.1",
            generatedAt: new Date().toISOString(),
          }),
          { status: 200 },
        );
      }
      return new Response("unstubbed", { status: 500 });
    });

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
    // Partial success — NOT the error card
    const root = screen.getByTestId("schools-dpa-form-success");
    expect(root.getAttribute("data-partial")).toBe("true");
    expect(root.getAttribute("data-stale-chunk")).toBe("true");
    expect(screen.getByTestId("schools-dpa-form-success-partial")).toBeInTheDocument();
    // Reload CTA must be present so user can recover without leaving.
    expect(screen.getByTestId("schools-dpa-form-success-reload")).toBeInTheDocument();
    // Request id (queue link for ops) still surfaced.
    expect(screen.getByText(/stale-chunk-row-1/)).toBeInTheDocument();
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
