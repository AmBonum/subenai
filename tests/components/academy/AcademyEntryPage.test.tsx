import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { expectNoA11yViolations } from "../../utils/axe";
import type { AcademyEntryDetail } from "@/lib/academy/queries";

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return {
    ...actual,
    Link: ({ children, ...rest }: { children: React.ReactNode } & Record<string, unknown>) => (
      <a {...(rest as Record<string, unknown>)}>{children}</a>
    ),
  };
});

import { AcademyEntryPage } from "@/components/academy/AcademyEntryPage";

const lesson: AcademyEntryDetail = {
  id: "1",
  slug: "email-phishing",
  title: "Email phishing",
  excerpt: "...",
  hero_image_url: null,
  reading_minutes: null,
  published_at: "2026-01-01",
  content_type: "lesson",
  difficulty: "beginner",
  estimated_minutes: 9,
  hero_emoji: "📧",
  category: { slug: "phishing", name: "Phishing" },
  author: { slug: "ed", display_name: "Editorial" },
  subtitle: "Ako ho spoznať",
  body_mdx: "Úvod do phishingu.\n\n[[quiz:p-sms-posta-1]]",
  seo_title: null,
  seo_description: null,
  og_image_url: null,
  canonical_url: null,
  primary_keyword: null,
  faq_jsonb: null,
  sources: [],
};

describe("AcademyEntryPage", () => {
  it("renders a lesson with its body and inline interactive quiz", () => {
    render(<AcademyEntryPage entry={lesson} />);
    expect(screen.getByTestId("academy-entry-title")).toHaveTextContent("Email phishing");
    expect(screen.getByText("Úvod do phishingu.")).toBeInTheDocument();
    expect(screen.getByTestId("academy-quiz")).toBeInTheDocument();
  });

  it("has no a11y violations", async () => {
    const { container } = render(<AcademyEntryPage entry={lesson} />);
    await expectNoA11yViolations(container);
  });
});
