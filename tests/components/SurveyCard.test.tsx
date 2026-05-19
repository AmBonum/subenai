import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const updateSpy = vi.fn();
const eqSpy = vi.fn();

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn(() => ({
        update: (payload: unknown) => {
          updateSpy(payload);
          return { eq: (col: string, val: string) => eqSpy(col, val) };
        },
      })),
    },
  };
});

import { SurveyCard } from "@/components/quiz/survey/SurveyCard";

beforeEach(() => {
  updateSpy.mockReset();
  eqSpy.mockReset();
  eqSpy.mockResolvedValue({ error: null });
});

function expand() {
  fireEvent.click(screen.getByRole("button", { name: /Pomôž nám zlepšiť test/i }));
}

describe("SurveyCard — E2.3 growth questions", () => {
  it("renders the 4 new survey sections after expand (single/single/single/yesno)", () => {
    render(<SurveyCard shareId="ABC12345" />);
    expand();

    expect(screen.getByText(/Čoho sa najviac obávaš na internete\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Už ťa niekto raz oklamal\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Odkiaľ vieš o tomto teste\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Mali by sme robiť školenia zadarmo\?/i)).toBeInTheDocument();
  });

  it("hides the interests multi-select until wantsCourses is true", () => {
    render(<SurveyCard shareId="ABC12345" />);
    expand();

    // Initially hidden — no "Aké témy" label.
    expect(screen.queryByText(/Aké témy by ťa najviac zaujali/i)).not.toBeInTheDocument();

    // Click "Áno" on yesno → reveal multi-select.
    fireEvent.click(screen.getByRole("radio", { name: "Áno" }));
    expect(screen.getByText(/Aké témy by ťa najviac zaujali/i)).toBeInTheDocument();

    // Click "Nie" → hide again.
    fireEvent.click(screen.getByRole("radio", { name: "Nie" }));
    expect(screen.queryByText(/Aké témy by ťa najviac zaujali/i)).not.toBeInTheDocument();
  });

  it("submits only the filled fields (omits empty optional fields)", async () => {
    render(<SurveyCard shareId="ABC12345" />);
    expand();

    // Fill 2 of the 4 new fields, leave the rest empty.
    fireEvent.click(screen.getByRole("radio", { name: /Phishing \/ podvodné správy/i }));
    fireEvent.click(screen.getByRole("radio", { name: /TikTok/i }));

    fireEvent.click(screen.getByRole("button", { name: /Odoslať odpoveď/i }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    const payload = updateSpy.mock.calls[0][0] as Record<string, unknown>;

    expect(payload.top_fear).toBe("phishing");
    expect(payload.referral_source).toBe("tiktok");
    expect(payload.has_been_scammed).toBeUndefined();
    expect(payload.wants_courses).toBeUndefined();
    expect(payload.interests).toBeUndefined();
    expect(payload.survey_extras_completed).toBe(true);
    expect(payload.survey_completed).toBe(true);

    expect(eqSpy).toHaveBeenCalledWith("share_id", "ABC12345");
  });

  it("includes interests in payload only when wantsCourses === true AND interests has items", async () => {
    render(<SurveyCard shareId="ABC12345" />);
    expand();

    fireEvent.click(screen.getByRole("radio", { name: "Áno" }));
    fireEvent.click(screen.getByRole("button", { name: /SMS \/ smishing/i }));
    fireEvent.click(screen.getByRole("button", { name: /Email phishing/i }));

    fireEvent.click(screen.getByRole("button", { name: /Odoslať odpoveď/i }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    const payload = updateSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.wants_courses).toBe(true);
    expect(payload.interests).toEqual(["sms", "email"]);
  });

  it("omits interests when wantsCourses is true but no interest is selected (zero noise)", async () => {
    render(<SurveyCard shareId="ABC12345" />);
    expand();

    fireEvent.click(screen.getByRole("radio", { name: "Áno" }));

    fireEvent.click(screen.getByRole("button", { name: /Odoslať odpoveď/i }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    const payload = updateSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.wants_courses).toBe(true);
    expect(payload.interests).toBeUndefined();
  });

  it("submits wants_courses=false when user picks Nie (and skips interests)", async () => {
    render(<SurveyCard shareId="ABC12345" />);
    expand();

    fireEvent.click(screen.getByRole("radio", { name: "Nie" }));

    fireEvent.click(screen.getByRole("button", { name: /Odoslať odpoveď/i }));

    await waitFor(() => expect(updateSpy).toHaveBeenCalledTimes(1));
    const payload = updateSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.wants_courses).toBe(false);
    expect(payload.interests).toBeUndefined();
  });

  it("after success with wantsCourses=true, thank-you state shows /courses CTA", async () => {
    render(<SurveyCard shareId="ABC12345" />);
    expand();
    fireEvent.click(screen.getByRole("radio", { name: "Áno" }));
    fireEvent.click(screen.getByRole("button", { name: /Odoslať odpoveď/i }));

    await waitFor(() => expect(screen.getByText(/Vďaka!/)).toBeInTheDocument());
    expect(
      screen.getByRole("link", { name: /Pozri si naše bezplatné školenia/i }),
    ).toBeInTheDocument();
  });

  it("after success with wantsCourses=false, thank-you state has NO /courses CTA", async () => {
    render(<SurveyCard shareId="ABC12345" />);
    expand();
    fireEvent.click(screen.getByRole("radio", { name: "Nie" }));
    fireEvent.click(screen.getByRole("button", { name: /Odoslať odpoveď/i }));

    await waitFor(() => expect(screen.getByText(/Vďaka!/)).toBeInTheDocument());
    expect(
      screen.queryByRole("link", { name: /Pozri si naše bezplatné školenia/i }),
    ).not.toBeInTheDocument();
  });

  it("blocks a second submit while the first is in-flight (saving guard)", async () => {
    render(<SurveyCard shareId="ABC12345" />);
    expand();

    const submit = screen.getByRole("button", { name: /Odoslať odpoveď/i });
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => expect(updateSpy).toHaveBeenCalled());
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });
});
