import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a role="link" data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
  createFileRoute:
    () =>
    <T,>(opts: T) =>
      opts,
}));

vi.mock("@/hooks/useConsent", () => ({
  useConsent: () => ({ openPreferences: vi.fn(), record: null }),
}));

import { ManageSupportForm } from "@/routes/manage-support";

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ManageSupportForm (/manage-support)", () => {
  it("disables submit until a plausible e-mail is entered", () => {
    render(<ManageSupportForm />);
    const submit = screen.getByRole("button", { name: /Poslať odkaz/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: "not-an-email" } });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: "anna@example.test" } });
    expect(submit).not.toBeDisabled();
  });

  it("posts to /api/portal-magic-link and shows the submitted state", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, message: "..." }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    render(<ManageSupportForm />);
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: "anna@example.test" } });
    fireEvent.click(screen.getByRole("button", { name: /Poslať odkaz/i }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));
    expect(fetchSpy.mock.calls[0][0]).toBe("/api/portal-magic-link");
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    // VITE_TURNSTILE_SITE_KEY is unset in jsdom → token is the "disabled"
    // sentinel so the form still submits and the misconfig stays visible.
    expect(body).toMatchObject({ email: "anna@example.test" });
    expect(body.turnstile_token).toBeDefined();

    await waitFor(() => expect(screen.getByText(/Skontroluj e-mail/i)).toBeInTheDocument());
    expect(screen.getByText(/anna@example\.test/i)).toBeInTheDocument();
  });

  it("includes the anti-enumeration note in the form hint", () => {
    render(<ManageSupportForm />);
    expect(screen.getByText(/anti-enumeration/i)).toBeInTheDocument();
  });

  it("surfaces an error when the server returns a non-200 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "email_not_configured" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );

    render(<ManageSupportForm />);
    fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: "x@y.test" } });
    fireEvent.click(screen.getByRole("button", { name: /Poslať odkaz/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toMatch(/email_not_configured/);
  });
});
