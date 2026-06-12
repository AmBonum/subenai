import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// E48.3 regression fix — /kontakt page mounts Turnstile and sends
// turnstile_token in the POST body.

// The route component renders <Link> in the success state (tokenized
// thread link) — mock the router so the page renders without a
// RouterProvider, serializing `search` into the href for assertions.
vi.mock("@tanstack/react-router", () => ({
  createFileRoute:
    () =>
    <T,>(opts: T) =>
      opts,
  Link: ({
    children,
    to,
    params,
    search,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to?: string;
    params?: Record<string, string>;
    search?: Record<string, string>;
  }) => {
    let href = to ?? "";
    for (const [k, v] of Object.entries(params ?? {})) href = href.replace(`$${k}`, v);
    if (search) href += `?${new URLSearchParams(search).toString()}`;
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  },
}));

// Mock TurnstileWidget so tests don't need a real Cloudflare script.
vi.mock("@/components/common/TurnstileWidget", () => ({
  TurnstileWidget: ({ onToken }: { onToken: (t: string | null) => void }) => {
    return (
      <div data-testid="mock-turnstile-widget">
        <button
          type="button"
          data-testid="mock-turnstile-solve"
          onClick={() => onToken("mock-token-abc")}
        >
          Solve
        </button>
      </div>
    );
  },
}));

// Import after the mock so the mock takes effect.
import { KontaktPage } from "@/routes/contact-form.index";

describe("KontaktPage — Turnstile integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the Turnstile slot inside the form", () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response());
    vi.stubGlobal("fetch", fetchMock);

    render(<KontaktPage />);
    expect(screen.getByTestId("mock-turnstile-widget")).toBeInTheDocument();
    expect(screen.getByTestId("kontakt-form-turnstile-slot")).toBeInTheDocument();
  });

  it("blocks submit with an error when Turnstile token is absent", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<KontaktPage />);

    await user.type(screen.getByTestId("kontakt-form-subject-input"), "Test subject");
    await user.click(screen.getByTestId("kontakt-form-category-select"));
    await user.click(await screen.findByTestId("kontakt-form-category-option-question"));
    await user.type(
      screen.getByTestId("kontakt-form-body-textarea"),
      "This is a test message body.",
    );
    await user.type(screen.getByTestId("kontakt-form-email-input"), "user@example.com");

    // Do NOT click "Solve" — token stays null.
    await user.click(screen.getByTestId("kontakt-form-submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("kontakt-form-submit-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("kontakt-form-submit-error")).toHaveTextContent(
      "Overenie proti spamu sa nedokončilo",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("includes turnstile_token in the POST body after solving", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, ticket_id: "tkt-789", view_token: "v".repeat(64) }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<KontaktPage />);

    // Solve Turnstile first.
    await user.click(screen.getByTestId("mock-turnstile-solve"));

    await user.type(screen.getByTestId("kontakt-form-subject-input"), "Test subject");
    await user.click(screen.getByTestId("kontakt-form-category-select"));
    await user.click(await screen.findByTestId("kontakt-form-category-option-question"));
    await user.type(
      screen.getByTestId("kontakt-form-body-textarea"),
      "This is a test message body.",
    );
    await user.type(screen.getByTestId("kontakt-form-email-input"), "user@example.com");

    await user.click(screen.getByTestId("kontakt-form-submit-button"));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());

    const [_url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({ turnstile_token: "mock-token-abc" });
    expect(body.subject).toBe("Test subject");

    // Success state is shown, including the tokenized thread link.
    await waitFor(() => expect(screen.getByTestId("kontakt-success-state")).toBeInTheDocument());
    expect(screen.getByTestId("kontakt-success-thread-link")).toHaveAttribute(
      "href",
      `/contact-form/ticket/tkt-789?token=${"v".repeat(64)}`,
    );
  });
});

describe("KontaktPage — ?topic= prefill from /contact topic cards", () => {
  it("preselects the category and prefills the subject for topic=gdpr", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<KontaktPage topic="gdpr" />);
    expect(screen.getByTestId("kontakt-form-subject-input")).toHaveValue("GDPR žiadosť");
    expect(screen.getByTestId("kontakt-form-category-select")).toHaveTextContent(
      "Žiadosť o údaje (GDPR)",
    );
  });

  it("maps topic=tech to the bug category with the tech subject", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<KontaktPage topic="tech" />);
    expect(screen.getByTestId("kontakt-form-subject-input")).toHaveValue("Technická pomoc");
    expect(screen.getByTestId("kontakt-form-category-select")).toHaveTextContent(
      "Chyba alebo problém",
    );
  });

  it("leaves subject and category empty without a topic", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<KontaktPage />);
    expect(screen.getByTestId("kontakt-form-subject-input")).toHaveValue("");
    expect(screen.getByTestId("kontakt-form-category-select")).toHaveTextContent(
      "Vyberte kategóriu",
    );
  });
});
