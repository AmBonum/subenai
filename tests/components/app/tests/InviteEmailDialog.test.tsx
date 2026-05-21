import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

// vi.mock is hoisted above local declarations — use vi.hoisted to keep
// the shared mock reference accessible from both the factory and the tests.
const { getSessionMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn().mockResolvedValue({
    data: { session: { access_token: "test-jwt-stub" } },
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: getSessionMock },
  },
}));

import { InviteEmailDialog } from "@/components/app/tests/InviteEmailDialog";

const fetchMock = vi.fn();
const originalFetch = globalThis.fetch;

beforeEach(() => {
  fetchMock.mockReset();
  getSessionMock.mockClear();
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

describe("InviteEmailDialog", () => {
  it("renders the recipients textarea + submit button when open", () => {
    render(<InviteEmailDialog open={true} onClose={vi.fn()} testId="tst-1" hasPassword={false} />);
    expect(screen.getByTestId("test-editor-invite-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-invite-recipients-input")).toBeInTheDocument();
    expect(screen.getByTestId("test-editor-invite-submit")).toBeInTheDocument();
  });

  it("disables Submit while textarea is empty", () => {
    render(<InviteEmailDialog open={true} onClose={vi.fn()} testId="tst-1" hasPassword={false} />);
    expect(screen.getByTestId("test-editor-invite-submit")).toBeDisabled();
  });

  it("counts valid + invalid recipients in the summary", () => {
    render(<InviteEmailDialog open={true} onClose={vi.fn()} testId="tst-1" hasPassword={false} />);
    fireEvent.change(screen.getByTestId("test-editor-invite-recipients-input"), {
      target: { value: "good@example.com, bad, also-bad" },
    });
    const summary = screen.getByTestId("test-editor-invite-summary").textContent ?? "";
    expect(summary).toMatch(/1/);
    // "Neplatných: 2" or "Invalid: 2"
    expect(summary).toMatch(/2/);
    expect(screen.getByTestId("test-editor-invite-invalid")).toBeInTheDocument();
  });

  it("doesn't show password section when test has no password", () => {
    render(<InviteEmailDialog open={true} onClose={vi.fn()} testId="tst-1" hasPassword={false} />);
    fireEvent.change(screen.getByTestId("test-editor-invite-recipients-input"), {
      target: { value: "good@example.com" },
    });
    expect(
      screen.queryByTestId("test-editor-invite-include-password-checkbox"),
    ).not.toBeInTheDocument();
  });

  it("shows the include-password checkbox when test has a password", () => {
    render(<InviteEmailDialog open={true} onClose={vi.fn()} testId="tst-1" hasPassword={true} />);
    expect(screen.getByTestId("test-editor-invite-include-password-checkbox")).toBeInTheDocument();
    // Password input is hidden until the checkbox is checked.
    expect(screen.queryByTestId("test-editor-invite-password-input")).not.toBeInTheDocument();
  });

  it("POSTs to /api/tests/send-invites with the validated recipients on submit", async () => {
    fetchMock.mockResolvedValue(res(200, { ok: true, sent: 2, failed: 0 }));
    const onClose = vi.fn();
    render(<InviteEmailDialog open={true} onClose={onClose} testId="tst-1" hasPassword={false} />);
    fireEvent.change(screen.getByTestId("test-editor-invite-recipients-input"), {
      target: { value: "one@example.com, two@example.com, not-an-email" },
    });
    fireEvent.click(screen.getByTestId("test-editor-invite-submit"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/tests/send-invites");
    expect(init?.method).toBe("POST");
    const parsed = JSON.parse(init?.body as string);
    expect(parsed.test_id).toBe("tst-1");
    expect(parsed.recipients).toEqual(["one@example.com", "two@example.com"]);
    expect(parsed.include_password).toBe(false);
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("includes the password in the payload when the user opts in", async () => {
    fetchMock.mockResolvedValue(res(200, { ok: true, sent: 1, failed: 0 }));
    render(<InviteEmailDialog open={true} onClose={vi.fn()} testId="tst-1" hasPassword={true} />);
    fireEvent.change(screen.getByTestId("test-editor-invite-recipients-input"), {
      target: { value: "one@example.com" },
    });
    fireEvent.click(screen.getByTestId("test-editor-invite-include-password-checkbox"));
    const pwdInput = await screen.findByTestId("test-editor-invite-password-input");
    fireEvent.change(pwdInput, { target: { value: "current-password" } });
    fireEvent.click(screen.getByTestId("test-editor-invite-submit"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const parsed = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(parsed.include_password).toBe(true);
    expect(parsed.password).toBe("current-password");
  });

  it("does NOT call onClose on 429 / 4xx error responses (keeps dialog open)", async () => {
    fetchMock.mockResolvedValue(res(429, { error: "rate_limited_ip" }));
    const onClose = vi.fn();
    render(<InviteEmailDialog open={true} onClose={onClose} testId="tst-1" hasPassword={false} />);
    fireEvent.change(screen.getByTestId("test-editor-invite-recipients-input"), {
      target: { value: "one@example.com" },
    });
    fireEvent.click(screen.getByTestId("test-editor-invite-submit"));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });
});
