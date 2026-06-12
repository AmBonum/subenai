// E39.4 — RTL component test for TemplateCard.
//
// Note on scope: the brief asks for `TemplatesPage.test.tsx` covering the
// rewritten /app/templates route. The Phase A route rewrite has not landed
// yet — `src/routes/app.templates.tsx` still consumes `useTemplates()` and
// renders the legacy single-grid layout. The new `TemplateCard`,
// `TemplateDuplicateDialog`, `TemplateDeleteConfirm`, and `TemplatesTabs`
// components do exist (E39.3 in flight). Testing them at the component
// boundary covers the same matrix the brief targets — action-menu
// visibility per ownership, Slovak gdpr_purpose label (the BLOCKER fix
// from Appendix D § D1.8), and the use-button navigation hook — without
// coupling the test to a route file that's mid-rewrite. Once the route
// composes these components, this test continues to apply unchanged.

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// TemplateCard renders a router <Link> (public template page cross-link);
// this component test has no router context, so shim it the same way the
// other component suites do (see ResultsView.persist.test.tsx).
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => (
    <a data-testid={rest["data-testid"] as string | undefined}>{children}</a>
  ),
}));

import { TemplateCard } from "@/components/app/templates/TemplateCard";
import type { Template } from "@/lib/platform/types";

function makeTemplate(overrides: Partial<Template> = {}): Template {
  return {
    id: "tpl-1",
    title: "Onboarding kolegov",
    description: "Základná bezpečnostná hygiena pre nový tím.",
    question_ids: ["q1", "q2", "q3"],
    gdpr_purpose: "internal_training",
    owner_id: null,
    visibility: "public",
    fork_of: null,
    status: "published",
    license: "cc-by-4.0",
    author_display_name: null,
    age_rating: "all",
    slug: "onboarding-kolegov",
    published_at: "2026-05-20T10:00:00Z",
    updated_at: "2026-05-20T10:00:00Z",
    created_at: "2026-05-20T10:00:00Z",
    ...overrides,
  };
}

type Handler = (template: Template) => void;
let onUse: ReturnType<typeof vi.fn<Handler>>;
let onDuplicate: ReturnType<typeof vi.fn<Handler>>;
let onEdit: ReturnType<typeof vi.fn<Handler>>;
let onDelete: ReturnType<typeof vi.fn<Handler>>;

beforeEach(() => {
  onUse = vi.fn<Handler>();
  onDuplicate = vi.fn<Handler>();
  onEdit = vi.fn<Handler>();
  onDelete = vi.fn<Handler>();
});

describe("TemplateCard — rendering", () => {
  it("renders the title, description and the per-card test-id root", () => {
    const tpl = makeTemplate({ id: "tpl-render" });
    render(
      <TemplateCard
        template={tpl}
        mode="public"
        currentUserId={null}
        onUse={onUse}
        onDuplicate={onDuplicate}
      />,
    );
    expect(screen.getByTestId("templates-card-tpl-render")).toBeInTheDocument();
    expect(screen.getByTestId("templates-card-tpl-render-title")).toHaveTextContent(
      "Onboarding kolegov",
    );
    expect(screen.getByTestId("templates-card-tpl-render-description")).toHaveTextContent(
      /Základná bezpečnostná hygiena/,
    );
  });

  it("BLOCKER fix (Appendix D § D1.8): renders gdpr_purpose as Slovak label, NOT the raw enum", () => {
    const tpl = makeTemplate({ id: "tpl-purpose", gdpr_purpose: "internal_training" });
    render(
      <TemplateCard
        template={tpl}
        mode="public"
        currentUserId={null}
        onUse={onUse}
        onDuplicate={onDuplicate}
      />,
    );
    const purposeBadge = screen.getByTestId("templates-card-tpl-purpose-purpose-badge");
    expect(purposeBadge).toHaveTextContent("Interné vzdelávanie");
    expect(purposeBadge).not.toHaveTextContent("internal_training");
  });

  it.each([
    ["education", "Vzdelávanie"],
    ["marketing", "Marketing"],
    ["research", "Výskum"],
    ["recruitment", "Nábor"],
  ])("maps gdpr_purpose '%s' to Slovak label '%s'", (purpose, label) => {
    const tpl = makeTemplate({
      id: `tpl-${purpose}`,
      gdpr_purpose: purpose as Template["gdpr_purpose"],
    });
    render(
      <TemplateCard
        template={tpl}
        mode="public"
        currentUserId={null}
        onUse={onUse}
        onDuplicate={onDuplicate}
      />,
    );
    expect(screen.getByTestId(`templates-card-tpl-${purpose}-purpose-badge`)).toHaveTextContent(
      label,
    );
  });

  it("renders the 'Predvolené' ownership badge for a platform-default row (owner_id = null)", () => {
    const tpl = makeTemplate({ id: "tpl-default", owner_id: null });
    render(
      <TemplateCard
        template={tpl}
        mode="public"
        currentUserId="user-1"
        onUse={onUse}
        onDuplicate={onDuplicate}
      />,
    );
    expect(screen.getByTestId("templates-card-tpl-default-ownership-badge")).toHaveTextContent(
      "Predvolené",
    );
  });

  it("renders the 'Moja kópia' badge for an owned forked row", () => {
    const tpl = makeTemplate({
      id: "tpl-copy",
      owner_id: "user-1",
      fork_of: "tpl-src",
      visibility: "private",
      status: "draft",
    });
    render(
      <TemplateCard
        template={tpl}
        mode="mine"
        currentUserId="user-1"
        onUse={onUse}
        onDuplicate={onDuplicate}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    expect(screen.getByTestId("templates-card-tpl-copy-ownership-badge")).toHaveTextContent(
      "Moja kópia",
    );
  });

  it("renders the 13+ age badge when age_rating='thirteen_plus' and hides it for 'all'", () => {
    const ratedTpl = makeTemplate({ id: "tpl-rated", age_rating: "thirteen_plus" });
    const { rerender } = render(
      <TemplateCard
        template={ratedTpl}
        mode="public"
        currentUserId={null}
        onUse={onUse}
        onDuplicate={onDuplicate}
      />,
    );
    expect(screen.getByTestId("templates-card-tpl-rated-age-rating-badge")).toHaveTextContent(
      "13+",
    );

    const allTpl = makeTemplate({ id: "tpl-all", age_rating: "all" });
    rerender(
      <TemplateCard
        template={allTpl}
        mode="public"
        currentUserId={null}
        onUse={onUse}
        onDuplicate={onDuplicate}
      />,
    );
    expect(screen.queryByTestId("templates-card-tpl-all-age-rating-badge")).toBeNull();
  });

  it("renders the Slovak plural question count (1 → 'otázka', 3 → 'otázky', 5+ → 'otázok')", () => {
    const cases: Array<[number, RegExp]> = [
      [1, /1 otázka/],
      [3, /3 otázky/],
      [7, /7 otázok/],
    ];
    for (const [count, expected] of cases) {
      const tpl = makeTemplate({
        id: `tpl-q-${count}`,
        question_ids: Array.from({ length: count }, (_, i) => `q${i}`),
      });
      const { unmount } = render(
        <TemplateCard
          template={tpl}
          mode="public"
          currentUserId={null}
          onUse={onUse}
          onDuplicate={onDuplicate}
        />,
      );
      expect(screen.getByTestId(`templates-card-tpl-q-${count}-questions-count`)).toHaveTextContent(
        expected,
      );
      unmount();
    }
  });
});

describe("TemplateCard — actions", () => {
  it("Použiť calls onUse with the template (drives navigation to /app/tests/new?templateId=...)", () => {
    const tpl = makeTemplate({ id: "tpl-nav" });
    render(
      <TemplateCard
        template={tpl}
        mode="public"
        currentUserId={null}
        onUse={onUse}
        onDuplicate={onDuplicate}
      />,
    );
    fireEvent.click(screen.getByTestId("templates-card-tpl-nav-use-button"));
    expect(onUse).toHaveBeenCalledTimes(1);
    expect(onUse).toHaveBeenCalledWith(tpl);
  });

  it("action menu on a platform-default (owner_id=null) card exposes ONLY Duplikovať", async () => {
    const user = userEvent.setup();
    const tpl = makeTemplate({ id: "tpl-public-actions", owner_id: null });
    render(
      <TemplateCard
        template={tpl}
        mode="public"
        currentUserId="user-1"
        onUse={onUse}
        onDuplicate={onDuplicate}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    await user.click(screen.getByTestId("templates-card-tpl-public-actions-action-menu-trigger"));
    expect(
      await screen.findByTestId("templates-card-tpl-public-actions-action-duplicate"),
    ).toBeInTheDocument();
    // No Edit / Delete on a non-owned card even if the callbacks are passed.
    expect(screen.queryByTestId("templates-card-tpl-public-actions-action-edit")).toBeNull();
    expect(screen.queryByTestId("templates-card-tpl-public-actions-action-delete")).toBeNull();
  });

  it("action menu on an owned card exposes all three actions (Duplikovať, Upraviť, Vymazať)", async () => {
    const user = userEvent.setup();
    const tpl = makeTemplate({
      id: "tpl-owned-actions",
      owner_id: "user-1",
      visibility: "private",
      status: "draft",
    });
    render(
      <TemplateCard
        template={tpl}
        mode="mine"
        currentUserId="user-1"
        onUse={onUse}
        onDuplicate={onDuplicate}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    await user.click(screen.getByTestId("templates-card-tpl-owned-actions-action-menu-trigger"));
    expect(
      await screen.findByTestId("templates-card-tpl-owned-actions-action-duplicate"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("templates-card-tpl-owned-actions-action-edit")).toBeInTheDocument();
    expect(
      screen.getByTestId("templates-card-tpl-owned-actions-action-delete"),
    ).toBeInTheDocument();
  });

  it("clicking the Duplikovať menu item invokes onDuplicate with the template", async () => {
    const user = userEvent.setup();
    const tpl = makeTemplate({ id: "tpl-dup", owner_id: null });
    render(
      <TemplateCard
        template={tpl}
        mode="public"
        currentUserId="user-1"
        onUse={onUse}
        onDuplicate={onDuplicate}
      />,
    );
    await user.click(screen.getByTestId("templates-card-tpl-dup-action-menu-trigger"));
    const item = await screen.findByTestId("templates-card-tpl-dup-action-duplicate");
    await user.click(item);
    expect(onDuplicate).toHaveBeenCalledWith(tpl);
  });

  it("clicking Vymazať on an owned card invokes onDelete", async () => {
    const user = userEvent.setup();
    const tpl = makeTemplate({
      id: "tpl-del",
      owner_id: "user-1",
      visibility: "private",
      status: "draft",
    });
    render(
      <TemplateCard
        template={tpl}
        mode="mine"
        currentUserId="user-1"
        onUse={onUse}
        onDuplicate={onDuplicate}
        onEdit={onEdit}
        onDelete={onDelete}
      />,
    );
    await user.click(screen.getByTestId("templates-card-tpl-del-action-menu-trigger"));
    const item = await screen.findByTestId("templates-card-tpl-del-action-delete");
    await user.click(item);
    expect(onDelete).toHaveBeenCalledWith(tpl);
  });

  it("kebab trigger carries a Slovak aria-label that includes the template title", () => {
    const tpl = makeTemplate({ id: "tpl-aria", title: "Phishing 101" });
    render(
      <TemplateCard
        template={tpl}
        mode="public"
        currentUserId={null}
        onUse={onUse}
        onDuplicate={onDuplicate}
      />,
    );
    const trigger = screen.getByTestId("templates-card-tpl-aria-action-menu-trigger");
    expect(trigger).toHaveAttribute("aria-label", "Akcie pre šablónu Phishing 101");
  });
});
