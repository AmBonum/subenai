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
  createLazyFileRoute:
    () =>
    <T,>(opts: T) =>
      opts,
  useSearch: () => ({}),
}));

vi.mock("@/hooks/useConsent", () => ({
  useConsent: () => ({ openPreferences: vi.fn(), record: null }),
}));

import { DonateForm } from "@/routes/support.lazy";

const originalLocation = window.location;

beforeEach(() => {
  Object.defineProperty(window, "location", {
    writable: true,
    value: { ...originalLocation, href: "" },
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", { writable: true, value: originalLocation });
  vi.restoreAllMocks();
});

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/E-mail/i), { target: { value: "anna@example.test" } });
  fireEvent.change(screen.getByLabelText(/Meno alebo firma/i), {
    target: { value: "Anna Testovacia" },
  });
  fireEvent.click(screen.getByLabelText(/začatím poskytovania okamžite/i));
  fireEvent.click(screen.getByLabelText(/spracovanie mojich osobných údajov/i));
}

describe("DonateForm (/support)", () => {
  it("disables submit until amount, identity and both consents are set", () => {
    render(<DonateForm />);
    const submit = screen.getByRole("button", { name: /Pokračovať na platbu/i });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: "10 €" }));
    fillRequiredFields();
    expect(submit).not.toBeDisabled();
  });

  it("shows monthly tiers with no custom-amount option", () => {
    render(<DonateForm />);
    fireEvent.click(screen.getByRole("radio", { name: "Mesačne" }));
    expect(screen.getByRole("radio", { name: "5 €" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "10 €" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "25 €" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Iná suma/i })).not.toBeInTheDocument();
  });

  it("rejects custom oneoff amount above 500 EUR", () => {
    render(<DonateForm />);
    fireEvent.click(screen.getByRole("radio", { name: /Iná suma/i }));
    fireEvent.change(screen.getByLabelText(/Vlastná suma/i), { target: { value: "501" } });
    fillRequiredFields();
    expect(screen.getByRole("button", { name: /Pokračovať na platbu/i })).toBeDisabled();
  });

  it("disables footer-display checkbox until amount qualifies", () => {
    render(<DonateForm />);
    fireEvent.click(screen.getByRole("radio", { name: "10 €" }));
    fireEvent.click(screen.getByLabelText(/Chcem byť na zozname sponzorov/i));
    const footerCheckbox = screen.getByLabelText(/Zobraziť ma v päte/i);
    expect(footerCheckbox).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: "100 €" }));
    expect(screen.getByLabelText(/Zobraziť ma aj v päte stránky/i)).not.toBeDisabled();
  });

  it("posts validated payload and redirects to Stripe URL on success", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ url: "https://checkout.stripe.com/test_123" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    render(<DonateForm />);
    fireEvent.click(screen.getByRole("radio", { name: "25 €" }));
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /Pokračovať na platbu/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/create-checkout-session");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({
      mode: "oneoff",
      amount_eur: 25,
      email: "anna@example.test",
      name: "Anna Testovacia",
      consent_immediate_start: true,
      consent_data_processing: true,
    });
    await waitFor(() => expect(window.location.href).toBe("https://checkout.stripe.com/test_123"));
  });

  it("surfaces server error message and stays on the form", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "amount_out_of_range" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );

    render(<DonateForm />);
    fireEvent.click(screen.getByRole("radio", { name: "10 €" }));
    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: /Pokračovať na platbu/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alert").textContent).toMatch(/amount_out_of_range/);
  });

  it("renders cancellation banner when ?cancelled=1", () => {
    render(<DonateForm cancelled />);
    expect(screen.getByRole("status").textContent).toMatch(/Platbu si zrušil/);
  });
});
