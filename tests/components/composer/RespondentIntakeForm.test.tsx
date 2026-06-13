import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Avoid pulling the whole router (which itself wants providers); the only
// thing the form needs <Link> for is the privacy footnote.
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => {
    const { to: _to, ...domProps } = rest as { to?: string };
    return (
      <a href="#" {...(domProps as Record<string, unknown>)}>
        {children}
      </a>
    );
  },
}));

import { RespondentIntakeForm } from "@/components/composer/edu/intake/RespondentIntakeForm";
import { ConsentProvider } from "@/hooks/useConsent";
import { CONSENT_VERSION } from "@/lib/consent";

beforeEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
  window.localStorage.clear();
});

function setup(onReady = vi.fn()) {
  render(
    <ConsentProvider>
      <RespondentIntakeForm setId="set-xyz" authorLabel="Pán Krátky" onReady={onReady} />
    </ConsentProvider>,
  );
  return { onReady, user: userEvent.setup() };
}

describe("RespondentIntakeForm", () => {
  it("renders disclosure mentioning author + 12-month retention", () => {
    setup();
    expect(screen.getByRole("heading", { name: /Pred testom: kto si/i })).toBeInTheDocument();
    expect(screen.getByText(/Pán Krátky/i)).toBeInTheDocument();
    expect(screen.getByText(/12 mesiacov/i)).toBeInTheDocument();
  });

  it("submit button is disabled until name + email + consent valid", async () => {
    const { user } = setup();
    const btn = screen.getByRole("button", { name: /Pokračovať na test/i });
    expect(btn).toBeDisabled();
    await user.type(screen.getByLabelText(/Meno a priezvisko/i), "Jana Nováková");
    expect(btn).toBeDisabled();
    await user.type(screen.getByRole("textbox", { name: /^E-mail$/i }), "jana@skola.sk");
    expect(btn).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    expect(btn).not.toBeDisabled();
  });

  it("calls onReady with token+name+email after a successful POST", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ token: "jwt-stub" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const { onReady, user } = setup();
    await user.type(screen.getByLabelText(/Meno a priezvisko/i), "Jana Nováková");
    await user.type(screen.getByRole("textbox", { name: /^E-mail$/i }), "Jana@Skola.SK");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Pokračovať na test/i }));
    await waitFor(() => expect(onReady).toHaveBeenCalled());
    expect(onReady).toHaveBeenCalledWith({
      token: "jwt-stub",
      name: "Jana Nováková",
      email: "jana@skola.sk",
    });
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string);
    expect(body.set_id).toBe("set-xyz");
    expect(body.email).toBe("jana@skola.sk");
    expect(body.consent).toBe(true);
    expect(body.hp_url).toBe("");
  });

  it("renders an aria-live error message when server replies non-OK", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { "content-type": "application/json" },
      }),
    );
    const { user } = setup();
    await user.type(screen.getByLabelText(/Meno a priezvisko/i), "Jana Nováková");
    await user.type(screen.getByRole("textbox", { name: /^E-mail$/i }), "jana@skola.sk");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Pokračovať na test/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toMatch(/Príliš veľa pokusov/i),
    );
  });

  it("honeypot input has aria-hidden, tabindex=-1 and is positioned off-screen", () => {
    setup();
    const honeypotWrapper = document.querySelector('[aria-hidden="true"]') as HTMLElement;
    expect(honeypotWrapper).toBeTruthy();
    const hpInput = honeypotWrapper.querySelector('input[name="hp_url"]') as HTMLInputElement;
    expect(hpInput).toBeTruthy();
    expect(hpInput.tabIndex).toBe(-1);
    expect(hpInput.autocomplete).toBe("off");
    expect(honeypotWrapper.style.position).toBe("absolute");
    expect(honeypotWrapper.style.left).toBe("-9999px");
  });

  it("restores name + email + consent from sessionStorage when preferences are allowed", async () => {
    // Seed an accepted consent so the form will read storage.
    window.localStorage.setItem(
      "iiq_consent",
      JSON.stringify({
        version: CONSENT_VERSION,
        timestamp: new Date().toISOString(),
        categories: { necessary: true, preferences: true, analytics: false, marketing: false },
      }),
    );
    window.sessionStorage.setItem(
      "iiq_edu_intake:set-xyz",
      JSON.stringify({ name: "Tomáš Učiteľ", email: "tomas@skola.sk", consent: true }),
    );
    setup();
    await waitFor(() =>
      expect((screen.getByLabelText(/Meno a priezvisko/i) as HTMLInputElement).value).toBe(
        "Tomáš Učiteľ",
      ),
    );
    expect((screen.getByRole("textbox", { name: /^E-mail$/i }) as HTMLInputElement).value).toBe(
      "tomas@skola.sk",
    );
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
  });

  it("does NOT restore from sessionStorage when preferences consent is missing", async () => {
    // No iiq_consent in localStorage → defaults reject preferences.
    window.sessionStorage.setItem(
      "iiq_edu_intake:set-xyz",
      JSON.stringify({ name: "Should Not Appear", email: "nope@x.sk", consent: true }),
    );
    setup();
    // Wait a tick for the consent hydration + restore effect to settle.
    await waitFor(() =>
      expect((screen.getByLabelText(/Meno a priezvisko/i) as HTMLInputElement).value).toBe(""),
    );
    expect((screen.getByRole("textbox", { name: /^E-mail$/i }) as HTMLInputElement).value).toBe("");
    expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
    // And on top of NOT restoring, the form should wipe the stale copy
    // so it can't leak after a future consent grant on the same tab.
    expect(window.sessionStorage.getItem("iiq_edu_intake:set-xyz")).toBeNull();
  });

  it("persists typed values to sessionStorage on every change when preferences allowed", async () => {
    window.localStorage.setItem(
      "iiq_consent",
      JSON.stringify({
        version: CONSENT_VERSION,
        timestamp: new Date().toISOString(),
        categories: { necessary: true, preferences: true, analytics: false, marketing: false },
      }),
    );
    const { user } = setup();
    await user.type(screen.getByLabelText(/Meno a priezvisko/i), "Anna");
    await waitFor(() => {
      const raw = window.sessionStorage.getItem("iiq_edu_intake:set-xyz");
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw as string).name).toBe("Anna");
    });
  });

  it("clears sessionStorage on successful submit", async () => {
    window.localStorage.setItem(
      "iiq_consent",
      JSON.stringify({
        version: CONSENT_VERSION,
        timestamp: new Date().toISOString(),
        categories: { necessary: true, preferences: true, analytics: false, marketing: false },
      }),
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ token: "jwt-stub" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const { onReady, user } = setup();
    await user.type(screen.getByLabelText(/Meno a priezvisko/i), "Anna Nová");
    await user.type(screen.getByRole("textbox", { name: /^E-mail$/i }), "anna@x.sk");
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Pokračovať na test/i }));
    await waitFor(() => expect(onReady).toHaveBeenCalled());
    expect(window.sessionStorage.getItem("iiq_edu_intake:set-xyz")).toBeNull();
  });
});
