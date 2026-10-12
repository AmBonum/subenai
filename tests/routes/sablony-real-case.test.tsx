import type { ComponentProps, JSX, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { Template } from "@/lib/platform/types";

const slugState = { slug: "bec-podvodny-email-od-sefa" };

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: unknown; children: ReactNode } & ComponentProps<"a">) => (
    <a data-to={typeof to === "string" ? to : ""} {...rest}>
      {children}
    </a>
  ),
  createLazyFileRoute:
    () =>
    <T,>(opts: T) =>
      opts,
  useParams: () => ({ slug: slugState.slug }),
}));

const makeTemplate = (slug: string): Template => ({
  id: "tpl-1",
  title: "Šablóna",
  description: "Popis",
  question_ids: ["a", "b"],
  gdpr_purpose: "internal_training",
  owner_id: null,
  visibility: "public",
  fork_of: null,
  status: "published",
  license: "cc-by-4.0",
  author_display_name: "subenai",
  age_rating: "all",
  slug,
  published_at: "2026-10-12T00:00:00Z",
  updated_at: "2026-10-12T00:00:00Z",
  created_at: "2026-10-12T00:00:00Z",
});

vi.mock("@/lib/platform/queries", () => ({
  usePublicTemplateBySlug: (slug: string) => ({
    data: makeTemplate(slug),
    isLoading: false,
    isError: false,
  }),
  usePublicTemplates: () => ({
    data: [makeTemplate("skola-falosne-eshopy"), { ...makeTemplate("phishing-101"), id: "tpl-2" }],
    isLoading: false,
    isError: false,
  }),
}));

import { Route as DetailRoute } from "@/routes/sablony.$slug.lazy";
import { Route as IndexRoute } from "@/routes/sablony.index.lazy";

type RouteConfig = { component: () => JSX.Element };
const DetailPage = (DetailRoute as unknown as RouteConfig).component;
const IndexPage = (IndexRoute as unknown as RouteConfig).component;

describe("/sablony real-case metadata (E66.3)", () => {
  it("detail shows the audience badge, sources and a wizard CTA", () => {
    slugState.slug = "bec-podvodny-email-od-sefa";
    render(<DetailPage />);
    expect(screen.getByTestId("sablony-detail-audience")).toHaveTextContent("Pre firmy");
    expect(screen.getByTestId("sablony-detail-sources-heading")).toHaveTextContent(
      "Podľa skutočného prípadu",
    );
    expect(screen.getByTestId("sablony-detail-source-0-link")).toHaveAttribute(
      "href",
      expect.stringMatching(/^https:\/\//),
    );
    expect(screen.getByTestId("sablony-detail-cta-use")).toHaveAttribute(
      "href",
      "/app/tests/new?step=1&templateId=tpl-1",
    );
  });

  it("detail omits the real-case blocks for a template outside the catalogue", () => {
    slugState.slug = "komunitna-sablona";
    render(<DetailPage />);
    expect(screen.queryByTestId("sablony-detail-audience")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sablony-detail-sources")).not.toBeInTheDocument();
  });

  it("cards badge school templates but not general-public ones", () => {
    render(<IndexPage />);
    expect(screen.getByTestId("sablony-card-tpl-1-audience")).toHaveTextContent("Pre školy");
    expect(screen.queryByTestId("sablony-card-tpl-2-audience")).not.toBeInTheDocument();
  });
});
