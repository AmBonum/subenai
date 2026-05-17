import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, renderHook } from "@testing-library/react";

let currentShareId = "abcdefgh";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    createFileRoute: () => (config: unknown) => {
      const r = config as Record<string, unknown>;
      return { ...r, useParams: () => ({ shareId: currentShareId }) };
    },
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
    useNavigate: () => () => undefined,
  };
});

import { useTests } from "@/lib/platform/mock-store";
import { Route } from "@/routes/t.$shareId";

type RouteConfig = { component: () => JSX.Element };
const Page = (Route as unknown as RouteConfig).component;

function firstPublishedShareId(): string {
  const tests = renderHook(() => useTests()).result.current;
  const t = tests.find((x) => x.status === "published");
  if (!t) throw new Error("seed missing a published test");
  return t.share_id;
}

describe("/t/$shareId — public respondent flow", () => {
  it("renders not-found banner when shareId is too short", () => {
    currentShareId = "abc";
    render(<Page />);
    expect(screen.getByTestId("respondent-flow-error-not-found")).toBeInTheDocument();
  });

  it("renders not-found banner when shareId doesn't match any test", () => {
    currentShareId = "no-such-share-id";
    render(<Page />);
    expect(screen.getByTestId("respondent-flow-error-not-found")).toBeInTheDocument();
  });

  it("renders the flow root + intake stage for a valid published shareId", () => {
    currentShareId = firstPublishedShareId();
    render(<Page />);
    expect(screen.getByTestId("respondent-flow-root")).toBeInTheDocument();
    expect(screen.getByTestId("respondent-flow-intake-consent-checkbox")).toBeInTheDocument();
    expect(screen.getByTestId("respondent-flow-intake-submit-button")).toBeInTheDocument();
  });

  it("blocks intake submission when consent is missing", () => {
    currentShareId = firstPublishedShareId();
    render(<Page />);
    fireEvent.click(screen.getByTestId("respondent-flow-intake-submit-button"));
    expect(screen.getByTestId("respondent-flow-intake-error")).toBeInTheDocument();
  });
});
