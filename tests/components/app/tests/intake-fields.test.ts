// E50 review fix (6) — intake_fields toggle ↔ jsonb shape mapping. The
// produced shape must match what IntakeStep.tsx renders and what
// SessionsList.respondentLabel reads back (ids "name" / "email").

import { describe, it, expect } from "vitest";

import { buildIntakeFields, parseIntakeFields } from "@/components/app/tests/intake-fields";
import type { IntakeField } from "@/lib/platform/types";

describe("buildIntakeFields", () => {
  it("produces the exact IntakeStep field shape for name + email", () => {
    const fields = buildIntakeFields({
      name: { enabled: true, required: false },
      email: { enabled: true, required: true },
    });
    expect(fields).toEqual([
      { id: "name", label: "Meno", type: "text", required: false, pii: true },
      { id: "email", label: "E-mail", type: "email", required: true, pii: true },
    ]);
  });

  it("omits disabled fields entirely", () => {
    expect(
      buildIntakeFields({
        name: { enabled: false, required: false },
        email: { enabled: false, required: false },
      }),
    ).toEqual([]);
    expect(
      buildIntakeFields({
        name: { enabled: true, required: true },
        email: { enabled: false, required: false },
      }),
    ).toEqual([{ id: "name", label: "Meno", type: "text", required: true, pii: true }]);
  });

  it("preserves unmanaged legacy/custom fields across a save", () => {
    const custom: IntakeField = {
      id: "if_dept",
      label: "Oddelenie",
      type: "select",
      required: false,
      options: ["HR", "IT"],
      pii: false,
    };
    const fields = buildIntakeFields(
      { name: { enabled: true, required: false }, email: { enabled: false, required: false } },
      [custom, { id: "name", label: "Meno", type: "text", required: true, pii: true }],
    );
    expect(fields).toEqual([
      { id: "name", label: "Meno", type: "text", required: false, pii: true },
      custom,
    ]);
  });
});

describe("parseIntakeFields", () => {
  it("round-trips toggles through build → parse", () => {
    const toggles = {
      name: { enabled: true, required: true },
      email: { enabled: true, required: false },
    };
    expect(parseIntakeFields(buildIntakeFields(toggles))).toEqual(toggles);
  });

  it("treats missing/null/non-array input as all-disabled", () => {
    const off = { enabled: false, required: false };
    expect(parseIntakeFields(null)).toEqual({ name: off, email: off });
    expect(parseIntakeFields(undefined)).toEqual({ name: off, email: off });
    // DB default is '{}'::jsonb (an object, not an array) — must not throw.
    expect(parseIntakeFields({} as unknown as IntakeField[])).toEqual({ name: off, email: off });
  });
});
