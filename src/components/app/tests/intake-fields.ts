import type { IntakeField } from "@/lib/platform/types";

export interface IntakeToggles {
  name: { enabled: boolean; required: boolean };
  email: { enabled: boolean; required: boolean };
}

const MANAGED_IDS = new Set(["name", "email"]);

// Field ids are load-bearing: the respondent runner (IntakeStep.tsx) keys
// sessions.intake_data by field id, and SessionsList.respondentLabel reads
// intake_data.name / intake_data.email to label the row. Labels are the
// Slovak respondent-facing copy (production UI rule).
export function buildIntakeFields(
  toggles: IntakeToggles,
  existing: IntakeField[] = [],
): IntakeField[] {
  const fields: IntakeField[] = [];
  if (toggles.name.enabled) {
    fields.push({
      id: "name",
      label: "Meno",
      type: "text",
      required: toggles.name.required,
      pii: true,
    });
  }
  if (toggles.email.enabled) {
    fields.push({
      id: "email",
      label: "E-mail",
      type: "email",
      required: toggles.email.required,
      pii: true,
    });
  }
  // Fields this editor doesn't manage (legacy/custom ids) survive a save.
  for (const f of existing) {
    if (!MANAGED_IDS.has(f.id)) fields.push(f);
  }
  return fields;
}

export function parseIntakeFields(fields: IntakeField[] | null | undefined): IntakeToggles {
  const arr = Array.isArray(fields) ? fields : [];
  const name = arr.find((f) => f.id === "name");
  const email = arr.find((f) => f.id === "email");
  return {
    name: { enabled: !!name, required: name?.required ?? false },
    email: { enabled: !!email, required: email?.required ?? false },
  };
}
