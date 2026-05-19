import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ConsentProvider } from "@/hooks/useConsent";
import { TrapDialog } from "@/components/quiz/results/TrapDialog";
import { TRAP_SEEN_STORAGE_KEY } from "@/lib/data-trap/copy";
import { supabase } from "@/integrations/supabase/client";

// Centralised guard against the design-invariant violations we care about
// most. ANY non-flag write to localStorage, ANY fetch, ANY supabase write
// from inside this component is a regression of the privacy promise.
let fetchSpy: ReturnType<typeof vi.fn>;
let setItemSpy: ReturnType<typeof vi.spyOn>;
let originalFetch: typeof globalThis.fetch | undefined;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  fetchSpy = vi.fn();
  globalThis.fetch = fetchSpy as typeof globalThis.fetch;
  setItemSpy = vi.spyOn(Storage.prototype, "setItem");
});

afterEach(() => {
  globalThis.fetch = originalFetch as typeof globalThis.fetch;
  setItemSpy.mockRestore();
});

function renderTrap(open = true, onOpenChange = vi.fn()) {
  return render(
    <ConsentProvider>
      <TrapDialog open={open} onOpenChange={onOpenChange} />
    </ConsentProvider>,
  );
}

describe("TrapDialog — design invariants (no I/O of field values)", () => {
  it("never calls fetch when the user types into any field", async () => {
    renderTrap();
    const rc = await screen.findByLabelText(/Rodné číslo/i);
    fireEvent.change(rc, { target: { value: "950101/1234" } });
    const card = screen.getByLabelText(/Číslo karty/i);
    fireEvent.change(card, { target: { value: "4242424242424242" } });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("never calls localStorage.setItem during field input", async () => {
    renderTrap();
    const rc = await screen.findByLabelText(/Rodné číslo/i);
    fireEvent.change(rc, { target: { value: "950101/1234" } });
    fireEvent.change(screen.getByLabelText(/CVV/i), { target: { value: "123" } });
    fireEvent.change(screen.getByLabelText(/OTP/i), { target: { value: "123456" } });

    expect(setItemSpy).not.toHaveBeenCalled();
  });

  // Phase 9e — PII matrix: explicit supabase guard. Earlier tests cover
  // fetch + localStorage.setItem; the third channel a trap-popup could
  // accidentally leak through is the supabase client. We spy on `from` /
  // `rpc` and assert no writes happen while the user types into ANY field.
  it("never calls supabase.from or supabase.rpc when the user types into any field", async () => {
    const fromSpy = vi.spyOn(supabase, "from");
    const rpcSpy = vi.spyOn(supabase, "rpc");
    try {
      renderTrap();
      const rc = await screen.findByLabelText(/Rodné číslo/i);
      fireEvent.change(rc, { target: { value: "950101/1234" } });
      fireEvent.change(screen.getByLabelText(/Číslo karty/i), {
        target: { value: "4242 4242 4242 4242" },
      });
      fireEvent.change(screen.getByLabelText(/CVV/i), { target: { value: "123" } });
      fireEvent.change(screen.getByLabelText(/IBAN/i), {
        target: { value: "SK31 1200 0000 1987 4263 7541" },
      });
      fireEvent.change(screen.getByLabelText(/Heslo/i), { target: { value: "hunter2" } });
      fireEvent.change(screen.getByLabelText(/OTP/i), { target: { value: "123456" } });

      expect(fromSpy).not.toHaveBeenCalled();
      expect(rpcSpy).not.toHaveBeenCalled();
    } finally {
      fromSpy.mockRestore();
      rpcSpy.mockRestore();
    }
  });
});

describe("TrapDialog — warning rendering", () => {
  it("shows a warning box once the matcher fires for the typed field", async () => {
    renderTrap();
    const rc = await screen.findByLabelText(/Rodné číslo/i);
    fireEvent.change(rc, { target: { value: "950101/1234" } });

    expect(await screen.findByText(/Rodné číslo si práve dal/i)).toBeInTheDocument();
    // Other fields must NOT show their warnings.
    expect(screen.queryByText(/Číslo karty \+ tvoje meno/i)).not.toBeInTheDocument();
  });

  it("renders the matching warning only after the value passes the matcher", async () => {
    renderTrap();
    const card = await screen.findByLabelText(/Číslo karty/i);
    // Almost-but-not-quite Luhn — should not warn.
    fireEvent.change(card, { target: { value: "1234567890123456" } });
    expect(screen.queryByText(/Číslo karty \+ tvoje meno/i)).not.toBeInTheDocument();

    // Real test card — warns.
    fireEvent.change(card, { target: { value: "4242 4242 4242 4242" } });
    expect(await screen.findByText(/Číslo karty \+ tvoje meno/i)).toBeInTheDocument();
  });

  it("shows the password warning even for short non-PII strings (label gate)", async () => {
    renderTrap();
    const pw = await screen.findByLabelText(/Heslo/i);
    fireEvent.change(pw, { target: { value: "x" } });
    expect(await screen.findByText(/Heslo si práve dal/i)).toBeInTheDocument();
  });

  it("keeps the warning visible once shown, even after the user clears the value", async () => {
    renderTrap();
    const otp = await screen.findByLabelText(/OTP/i);
    fireEvent.change(otp, { target: { value: "123456" } });
    expect(await screen.findByText(/OTP kód = živý kľúč/i)).toBeInTheDocument();

    fireEvent.change(otp, { target: { value: "" } });
    // The lesson stays — undoing the typo doesn't undo the lesson.
    expect(screen.getByText(/OTP kód = živý kľúč/i)).toBeInTheDocument();
  });
});

describe("TrapDialog — controlled API", () => {
  it("calls onOpenChange(false) and onAcknowledged when the primary CTA is clicked", () => {
    const onOpenChange = vi.fn();
    const onAcknowledged = vi.fn();
    render(
      <ConsentProvider>
        <TrapDialog open={true} onOpenChange={onOpenChange} onAcknowledged={onAcknowledged} />
      </ConsentProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Rozumiem — viac to nezadám/i }));
    expect(onAcknowledged).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not call onAcknowledged on passive close (ESC)", async () => {
    const onAcknowledged = vi.fn();
    render(
      <ConsentProvider>
        <TrapDialog open={true} onOpenChange={vi.fn()} onAcknowledged={onAcknowledged} />
      </ConsentProvider>,
    );
    fireEvent.keyDown(screen.getByLabelText(/Rodné číslo/i), { key: "Escape" });
    await waitFor(() => {
      expect(onAcknowledged).not.toHaveBeenCalled();
    });
  });

  it("renders nothing when open is false", async () => {
    renderTrap(false);
    await waitFor(() => {
      expect(screen.queryByLabelText(/Rodné číslo/i)).not.toBeInTheDocument();
    });
  });
});
