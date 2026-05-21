import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AdminPageExplainer } from "@/components/admin/AdminPageExplainer";
import skAdmin from "@/i18n/locales/sk/admin.json";

type DocLink = { label: string; href: string };
type ExplainerEntry = {
  title: string;
  lead: string;
  docs: { heading: string; links: DocLink[] };
};
const explainers = (skAdmin as unknown as { explainers: Record<string, ExplainerEntry> })
  .explainers;

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

describe("AdminPageExplainer", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setMatchMedia(false);
  });

  it("renders collapsed by default — body NOT visible", () => {
    render(<AdminPageExplainer pageKey="dashboard" />);
    const toggle = screen.getByTestId("admin-explainer-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("admin-explainer-lead")).toBeNull();
  });

  it("click toggle expands → lead paragraph visible", async () => {
    const user = userEvent.setup();
    render(<AdminPageExplainer pageKey="dashboard" />);
    await user.click(screen.getByTestId("admin-explainer-toggle"));
    expect(screen.getByTestId("admin-explainer-lead")).toBeVisible();
  });

  it("second click collapses → lead paragraph hidden again", async () => {
    const user = userEvent.setup();
    render(<AdminPageExplainer pageKey="dashboard" />);
    const toggle = screen.getByTestId("admin-explainer-toggle");
    await user.click(toggle);
    expect(screen.getByTestId("admin-explainer-lead")).toBeVisible();
    await user.click(toggle);
    expect(screen.queryByTestId("admin-explainer-lead")).toBeNull();
  });

  it("keyboard: Enter opens, Space closes", async () => {
    const user = userEvent.setup();
    render(<AdminPageExplainer pageKey="dashboard" />);
    const toggle = screen.getByTestId("admin-explainer-toggle");
    toggle.focus();
    expect(toggle).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("persists open state to localStorage on expand", async () => {
    const user = userEvent.setup();
    render(<AdminPageExplainer pageKey="users" />);
    await user.click(screen.getByTestId("admin-explainer-toggle"));
    expect(window.localStorage.getItem("admin-explainer-users")).toBe("1");
  });

  it("rehydrates open state from localStorage on mount", () => {
    window.localStorage.setItem("admin-explainer-users", "1");
    render(<AdminPageExplainer pageKey="users" />);
    expect(screen.getByTestId("admin-explainer-toggle")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("admin-explainer-lead")).toBeVisible();
  });

  it("per-pageKey storage is independent", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<AdminPageExplainer pageKey="dashboard" />);
    await user.click(screen.getByTestId("admin-explainer-toggle"));
    expect(window.localStorage.getItem("admin-explainer-dashboard")).toBe("1");
    expect(window.localStorage.getItem("admin-explainer-users")).toBeNull();
    unmount();

    render(<AdminPageExplainer pageKey="users" />);
    expect(screen.getByTestId("admin-explainer-toggle")).toHaveAttribute("aria-expanded", "false");
  });

  it("respects reduced-motion preference via matchMedia", async () => {
    setMatchMedia(true);
    render(<AdminPageExplainer pageKey="dashboard" />);
    const root = await screen.findByTestId("admin-explainer-root");
    // The data attribute lives on the inner card, sibling of the trigger.
    const card = root.querySelector("[data-reduced-motion]");
    expect(card).not.toBeNull();
    expect(card).toHaveAttribute("data-reduced-motion", "true");
  });

  it("aria-expanded toggles between 'false' and 'true' with state", async () => {
    const user = userEvent.setup();
    render(<AdminPageExplainer pageKey="dashboard" />);
    const toggle = screen.getByTestId("admin-explainer-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("aria-controls on the trigger matches the body id", async () => {
    const user = userEvent.setup();
    render(<AdminPageExplainer pageKey="dashboard" />);
    const toggle = screen.getByTestId("admin-explainer-toggle");
    const controls = toggle.getAttribute("aria-controls");
    expect(controls).toBeTruthy();
    await user.click(toggle);
    const body = screen.getByTestId("admin-explainer-body");
    expect(body.id).toBe(controls);
  });

  it("heading hierarchy: title is h2, section headings are h3", async () => {
    const user = userEvent.setup();
    render(<AdminPageExplainer pageKey="dashboard" />);
    expect(screen.getByTestId("admin-explainer-title").tagName).toBe("H2");
    await user.click(screen.getByTestId("admin-explainer-toggle"));
    expect(screen.getByTestId("admin-explainer-section-configure-heading").tagName).toBe("H3");
    expect(screen.getByTestId("admin-explainer-section-time-heading").tagName).toBe("H3");
    expect(screen.getByTestId("admin-explainer-section-pitfalls-heading").tagName).toBe("H3");
    expect(screen.getByTestId("admin-explainer-docs-heading").tagName).toBe("H3");
  });

  it("first doc link href matches the SK JSON for pageKey='users'", async () => {
    const user = userEvent.setup();
    render(<AdminPageExplainer pageKey="users" />);
    await user.click(screen.getByTestId("admin-explainer-toggle"));
    const first = screen.getByTestId("admin-explainer-doc-link-0");
    const expected = explainers.users.docs.links[0].href;
    expect(expected).toBe("/docs/admin/users");
    expect(first).toHaveAttribute("href", expected);
  });

  it("does not throw on a missing pageKey; title falls back to raw key", () => {
    expect(() => render(<AdminPageExplainer pageKey="nonexistent_page" />)).not.toThrow();
    expect(screen.getByTestId("admin-explainer-title")).toHaveTextContent("nonexistent_page.title");
  });

  it("renders at least one <li> in each of the three sections when expanded", async () => {
    const user = userEvent.setup();
    render(<AdminPageExplainer pageKey="dashboard" />);
    await user.click(screen.getByTestId("admin-explainer-toggle"));
    for (const section of ["configure", "time", "pitfalls"] as const) {
      const root = screen.getByTestId(`admin-explainer-section-${section}`);
      expect(root.querySelectorAll("li").length).toBeGreaterThanOrEqual(1);
    }
  });
});
