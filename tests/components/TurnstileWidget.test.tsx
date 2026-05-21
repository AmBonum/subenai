import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

import { TurnstileWidget } from "@/components/common/TurnstileWidget";

// E48.3 regression fix — unit tests for the shared Turnstile widget.

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

function makeTurnstileApi(widgetId = "widget-1") {
  const render = vi.fn().mockImplementation((_container, opts) => {
    // Simulate async token callback
    setTimeout(() => opts.callback("test-token-123"), 0);
    return widgetId;
  });
  const reset = vi.fn();
  const remove = vi.fn();
  return { render, reset, remove };
}

beforeEach(() => {
  // Clean up any script tags injected by previous tests.
  document.querySelectorAll(`script[src="${SCRIPT_SRC}"]`).forEach((el) => el.remove());
  delete (window as { turnstile?: unknown }).turnstile;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("TurnstileWidget — no siteKey", () => {
  it("calls onToken('disabled') immediately when siteKey is empty", () => {
    const onToken = vi.fn();
    render(<TurnstileWidget siteKey="" onToken={onToken} />);
    expect(onToken).toHaveBeenCalledWith("disabled");
  });
});

describe("TurnstileWidget — with siteKey + pre-loaded window.turnstile", () => {
  it("renders the widget and fires onToken when the Turnstile callback runs", async () => {
    const api = makeTurnstileApi();
    (window as { turnstile?: unknown }).turnstile = api;

    const onToken = vi.fn();
    render(<TurnstileWidget siteKey="0x_test_key" onToken={onToken} />);

    // container div is in the DOM
    expect(screen.getByTestId("turnstile-widget-container")).toBeInTheDocument();

    // wait for the async callback
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(api.render).toHaveBeenCalledOnce();
    expect(onToken).toHaveBeenCalledWith("test-token-123");
  });

  it("calls onToken(null) when expired-callback fires", async () => {
    const api = makeTurnstileApi();
    // Override render to fire expired-callback instead of the success callback.
    api.render.mockImplementation((_container, opts) => {
      setTimeout(() => {
        if (opts["expired-callback"]) opts["expired-callback"]();
      }, 0);
      return "w1";
    });
    (window as { turnstile?: unknown }).turnstile = api;

    const onToken = vi.fn();
    render(<TurnstileWidget siteKey="0x_test_key" onToken={onToken} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(onToken).toHaveBeenCalledWith(null);
  });

  it("removes the widget on unmount", async () => {
    const api = makeTurnstileApi("wid-cleanup");
    (window as { turnstile?: unknown }).turnstile = api;

    const onToken = vi.fn();
    const { unmount } = render(<TurnstileWidget siteKey="0x_test_key" onToken={onToken} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    unmount();
    expect(api.remove).toHaveBeenCalledWith("wid-cleanup");
  });
});

describe("TurnstileWidget — script injection", () => {
  it("injects a <script> tag when window.turnstile is absent", async () => {
    // Simulate a script load by dispatching the load event after injection.
    const api = makeTurnstileApi();
    vi.spyOn(document.head, "appendChild").mockImplementation((node) => {
      (window as { turnstile?: unknown }).turnstile = api;
      if (node instanceof HTMLScriptElement) {
        setTimeout(() => node.dispatchEvent(new Event("load")), 0);
      }
      return node;
    });

    const onToken = vi.fn();
    render(<TurnstileWidget siteKey="0x_test_key" onToken={onToken} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });

    expect(document.querySelector(`script[src="${SCRIPT_SRC}"]`)).toBeNull(); // mocked appendChild
    expect(api.render).toHaveBeenCalledOnce();
  });
});
