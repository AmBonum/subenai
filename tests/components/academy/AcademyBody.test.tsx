import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { expectNoA11yViolations } from "../../utils/axe";
import { AcademyBody } from "@/components/academy/AcademyBody";

describe("AcademyBody", () => {
  it("renders Markdown prose and an inline interactive quiz", () => {
    render(<AcademyBody body={"## Phishing\n\nPozor na linky.\n\n[[quiz:p-sms-posta-1]]"} />);
    expect(screen.getByText("Phishing")).toBeInTheDocument();
    expect(screen.getByText("Pozor na linky.")).toBeInTheDocument();
    expect(screen.getByTestId("academy-quiz")).toBeInTheDocument();
  });

  it("has no a11y violations", async () => {
    const { container } = render(
      <AcademyBody body={"# Nadpis\n\nText.\n\n[[quiz:p-sms-posta-1]]"} />,
    );
    await expectNoA11yViolations(container);
  });
});
