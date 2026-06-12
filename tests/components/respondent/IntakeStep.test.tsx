import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { IntakeStep } from "@/components/respondent/IntakeStep";
import type { IntakeField } from "@/lib/platform/types";

const NAME_FIELD: IntakeField = {
  id: "full_name",
  label: "Celé meno respondenta",
  type: "text",
  required: true,
  pii: true,
};

describe("IntakeStep — required-field validation", () => {
  it("rejects a whitespace-only value for a required field (does not submit)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<IntakeStep intakeFields={[NAME_FIELD]} onSubmit={onSubmit} />);

    // Consent must be granted first so we exercise the field validation,
    // not the consent gate.
    await user.click(screen.getByTestId("respondent-flow-intake-consent-checkbox"));
    await user.type(screen.getByTestId("respondent-flow-intake-name"), "   ");
    await user.click(screen.getByTestId("respondent-flow-intake-submit-button"));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByTestId("respondent-flow-intake-error")).toBeInTheDocument();
  });

  it("accepts a non-blank value and submits the trimmed-equivalent intake", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<IntakeStep intakeFields={[NAME_FIELD]} onSubmit={onSubmit} />);

    await user.click(screen.getByTestId("respondent-flow-intake-consent-checkbox"));
    await user.type(screen.getByTestId("respondent-flow-intake-name"), "Jana Nováková");
    await user.click(screen.getByTestId("respondent-flow-intake-submit-button"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({ full_name: "Jana Nováková" }, true);
  });
});
