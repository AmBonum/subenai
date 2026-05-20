import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const backSpy = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...rest
  }: {
    children: React.ReactNode;
    to: string;
  } & Record<string, unknown>) => (
    <a href={to} {...(rest as Record<string, unknown>)}>
      {children}
    </a>
  ),
  useRouter: () => ({ history: { back: backSpy } }),
}));

import { SmartBackLink } from "@/components/layout/SmartBackLink";

const originalReferrer = Object.getOwnPropertyDescriptor(Document.prototype, "referrer");

function setReferrer(value: string) {
  Object.defineProperty(document, "referrer", {
    configurable: true,
    get: () => value,
  });
}

function restoreReferrer() {
  if (originalReferrer) {
    Object.defineProperty(Document.prototype, "referrer", originalReferrer);
  }
}

beforeEach(() => {
  backSpy.mockReset();
});

afterEach(() => {
  restoreReferrer();
});

describe("SmartBackLink", () => {
  it("renders fallback link when there is no in-app history or same-origin referrer", () => {
    setReferrer("");
    Object.defineProperty(window.history, "length", { configurable: true, value: 1 });
    render(
      <SmartBackLink
        fallbackTo="/"
        backLabel="← Späť"
        fallbackLabel="← Späť na domov"
        testId="x-back"
      />,
    );
    const link = screen.getByTestId("x-back");
    expect(link.tagName).toBe("A");
    expect(link.textContent).toBe("← Späť na domov");
    expect(link.getAttribute("href")).toBe("/");
  });

  it("renders a button that pops router history when same-origin referrer exists", async () => {
    setReferrer(window.location.origin + "/test/builder/abc");
    Object.defineProperty(window.history, "length", { configurable: true, value: 2 });
    render(
      <SmartBackLink
        fallbackTo="/"
        backLabel="← Späť"
        fallbackLabel="← Späť na domov"
        testId="x-back"
      />,
    );
    const btn = await screen.findByTestId("x-back");
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.textContent).toBe("← Späť");
    await userEvent.click(btn);
    expect(backSpy).toHaveBeenCalledTimes(1);
  });
});
