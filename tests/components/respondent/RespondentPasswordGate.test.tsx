import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { RespondentPasswordGate } from "@/components/respondent/RespondentPasswordGate";

const fetchMock = vi.fn();
const originalFetch = globalThis.fetch;

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
});
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function res(status: number, body: object) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("RespondentPasswordGate", () => {
  it("renders the title + input + submit", () => {
    render(<RespondentPasswordGate shareId="share-x" onVerified={vi.fn()} />);
    expect(screen.getByTestId("respondent-password-gate-root")).toBeInTheDocument();
    expect(screen.getByTestId("respondent-password-gate-input")).toBeInTheDocument();
    expect(screen.getByTestId("respondent-password-gate-submit")).toBeInTheDocument();
  });

  it("renders the 'session expired' hint when reason=expired", () => {
    render(<RespondentPasswordGate shareId="share-x" reason="expired" onVerified={vi.fn()} />);
    expect(screen.getByTestId("respondent-password-gate-reason")).toBeInTheDocument();
  });

  it("calls onVerified when the API returns 200 ok", async () => {
    fetchMock.mockResolvedValue(res(200, { ok: true }));
    const onVerified = vi.fn();
    render(<RespondentPasswordGate shareId="share-x" onVerified={onVerified} />);
    fireEvent.change(screen.getByTestId("respondent-password-gate-input"), {
      target: { value: "right-password" },
    });
    fireEvent.click(screen.getByTestId("respondent-password-gate-submit"));
    await waitFor(() => expect(onVerified).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tests/verify-password",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("surfaces 'wrong password' on 401", async () => {
    fetchMock.mockResolvedValue(res(401, { error: "unauthorized" }));
    render(<RespondentPasswordGate shareId="share-x" onVerified={vi.fn()} />);
    fireEvent.change(screen.getByTestId("respondent-password-gate-input"), {
      target: { value: "wrong" },
    });
    fireEvent.click(screen.getByTestId("respondent-password-gate-submit"));
    const err = await screen.findByTestId("respondent-password-gate-error");
    expect(err).toBeInTheDocument();
  });

  it("surfaces 'share locked' on 429 share_locked + disables input", async () => {
    fetchMock.mockResolvedValue(res(429, { error: "share_locked" }));
    render(<RespondentPasswordGate shareId="share-x" onVerified={vi.fn()} />);
    fireEvent.change(screen.getByTestId("respondent-password-gate-input"), {
      target: { value: "anything" },
    });
    fireEvent.click(screen.getByTestId("respondent-password-gate-submit"));
    const err = await screen.findByTestId("respondent-password-gate-error");
    expect(err).toBeInTheDocument();
    // After share_locked, the input is disabled (retry doesn't help today).
    expect(screen.getByTestId("respondent-password-gate-input")).toBeDisabled();
  });

  it("surfaces 'rate_limited' on 429 with retry_after hint", async () => {
    fetchMock.mockResolvedValue(res(429, { error: "rate_limited", retry_after: 900 }));
    render(<RespondentPasswordGate shareId="share-x" onVerified={vi.fn()} />);
    fireEvent.change(screen.getByTestId("respondent-password-gate-input"), {
      target: { value: "anything" },
    });
    fireEvent.click(screen.getByTestId("respondent-password-gate-submit"));
    const err = await screen.findByTestId("respondent-password-gate-error");
    // The "minutes" placeholder is rendered into the error copy.
    expect(err.textContent).toMatch(/15/);
  });
});
