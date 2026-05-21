import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AppPageExplainer } from "@/components/user/AppPageExplainer";
import skApp from "@/i18n/locales/sk/app-explainers.json";

type DocLink = { label: string; href: string };
type ExplainerEntry = {
  title: string;
  lead: string;
  docs: { heading: string; links: DocLink[] };
};
const explainers = (skApp as unknown as { explainers: Record<string, ExplainerEntry> }).explainers;

function setMatchMedia(matches: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia;
}

describe("AppPageExplainer", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setMatchMedia(false);
  });

  it("renders collapsed by default — body NOT visible", () => {
    render(<AppPageExplainer pageKey="tests" />);
    const toggle = screen.getByTestId("app-explainer-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("app-explainer-lead")).toBeNull();
  });

  it("click toggle expands → lead paragraph visible", async () => {
    const user = userEvent.setup();
    render(<AppPageExplainer pageKey="tests" />);
    await user.click(screen.getByTestId("app-explainer-toggle"));
    expect(screen.getByTestId("app-explainer-lead")).toBeVisible();
  });

  it("second click collapses → lead paragraph hidden again", async () => {
    const user = userEvent.setup();
    render(<AppPageExplainer pageKey="tests" />);
    const toggle = screen.getByTestId("app-explainer-toggle");
    await user.click(toggle);
    expect(screen.getByTestId("app-explainer-lead")).toBeVisible();
    await user.click(toggle);
    expect(screen.queryByTestId("app-explainer-lead")).toBeNull();
  });

  it("keyboard: Enter opens, Space closes", async () => {
    const user = userEvent.setup();
    render(<AppPageExplainer pageKey="tests" />);
    const toggle = screen.getByTestId("app-explainer-toggle");
    toggle.focus();
    expect(toggle).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("persists open state to localStorage on expand", async () => {
    const user = userEvent.setup();
    render(<AppPageExplainer pageKey="tests" />);
    await user.click(screen.getByTestId("app-explainer-toggle"));
    expect(window.localStorage.getItem("app-explainer-tests")).toBe("1");
  });

  it("rehydrates open state from localStorage on mount", () => {
    window.localStorage.setItem("app-explainer-tests", "1");
    render(<AppPageExplainer pageKey="tests" />);
    expect(screen.getByTestId("app-explainer-toggle")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("app-explainer-lead")).toBeVisible();
  });

  it("per-pageKey storage is independent", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<AppPageExplainer pageKey="dashboard" />);
    await user.click(screen.getByTestId("app-explainer-toggle"));
    expect(window.localStorage.getItem("app-explainer-dashboard")).toBe("1");
    expect(window.localStorage.getItem("app-explainer-tests")).toBeNull();
    unmount();

    render(<AppPageExplainer pageKey="tests" />);
    expect(screen.getByTestId("app-explainer-toggle")).toHaveAttribute("aria-expanded", "false");
  });

  it("respects reduced-motion preference via matchMedia", async () => {
    setMatchMedia(true);
    render(<AppPageExplainer pageKey="tests" />);
    const root = await screen.findByTestId("app-explainer-root");
    const card = root.querySelector("[data-reduced-motion]");
    expect(card).not.toBeNull();
    expect(card).toHaveAttribute("data-reduced-motion", "true");
  });

  it("aria-expanded toggles between 'false' and 'true' with state", async () => {
    const user = userEvent.setup();
    render(<AppPageExplainer pageKey="tests" />);
    const toggle = screen.getByTestId("app-explainer-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("aria-controls on the trigger matches the body id", async () => {
    const user = userEvent.setup();
    render(<AppPageExplainer pageKey="tests" />);
    const toggle = screen.getByTestId("app-explainer-toggle");
    const controls = toggle.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    await user.click(toggle);
    const body = screen.getByTestId("app-explainer-body");
    expect(body.id).toBe(controls);
  });

  it("heading hierarchy: title is h2, section headings are h3", async () => {
    const user = userEvent.setup();
    render(<AppPageExplainer pageKey="tests" />);
    expect(screen.getByTestId("app-explainer-title").tagName).toBe("H2");
    await user.click(screen.getByTestId("app-explainer-toggle"));
    expect(screen.getByTestId("app-explainer-section-configure-heading").tagName).toBe("H3");
    expect(screen.getByTestId("app-explainer-section-time-heading").tagName).toBe("H3");
    expect(screen.getByTestId("app-explainer-section-pitfalls-heading").tagName).toBe("H3");
    expect(screen.getByTestId("app-explainer-docs-heading").tagName).toBe("H3");
  });

  it("first doc link href matches the SK JSON for pageKey='tests'", async () => {
    const user = userEvent.setup();
    render(<AppPageExplainer pageKey="tests" />);
    await user.click(screen.getByTestId("app-explainer-toggle"));
    const first = screen.getByTestId("app-explainer-doc-link-0");
    const expected = explainers.tests.docs.links[0].href;
    expect(expected.startsWith("/docs/app/")).toBe(true);
    expect(first).toHaveAttribute("href", expected);
  });

  it("does not throw on a missing pageKey; title falls back to raw key", () => {
    expect(() => render(<AppPageExplainer pageKey="nonexistent_page" />)).not.toThrow();
    expect(screen.getByTestId("app-explainer-title")).toHaveTextContent("nonexistent_page.title");
  });

  it("renders at least one <li> in each of the three sections when expanded", async () => {
    const user = userEvent.setup();
    render(<AppPageExplainer pageKey="tests" />);
    await user.click(screen.getByTestId("app-explainer-toggle"));
    for (const section of ["configure", "time", "pitfalls"] as const) {
      const root = screen.getByTestId(`app-explainer-section-${section}`);
      expect(root.querySelectorAll("li").length).toBeGreaterThanOrEqual(1);
    }
  });
});
