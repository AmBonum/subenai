// E50 review fix (6) — intake_fields authoring. Until this card existed no
// UI ever wrote tests.intake_fields, so every /t/ respondent stayed
// anonymous. Auto-saves on toggle (OrderModeToggle pattern).

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useUpdateTest } from "@/lib/platform/queries";
import type { IntakeField } from "@/lib/platform/types";
import { tFor } from "@/i18n/tests";
import { buildIntakeFields, parseIntakeFields, type IntakeToggles } from "./intake-fields";

interface Props {
  testId: string;
  intakeFields: IntakeField[];
}

export function IntakeFieldsCard({ testId, intakeFields }: Props) {
  const t = tFor("editor");
  const updateMut = useUpdateTest();
  const [toggles, setToggles] = useState<IntakeToggles>(() => parseIntakeFields(intakeFields));

  // Sync once per test identity (deep-link/refresh resolves async).
  const syncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (syncedRef.current !== testId) {
      syncedRef.current = testId;
      setToggles(parseIntakeFields(intakeFields));
    }
  }, [testId, intakeFields]);

  const persist = (next: IntakeToggles) => {
    const prev = toggles;
    setToggles(next);
    updateMut.mutate(
      { id: testId, patch: { intake_fields: buildIntakeFields(next, intakeFields) } },
      {
        onSuccess: () => toast.success(t("intake.save_success")),
        onError: () => {
          setToggles(prev);
          toast.error(t("intake.save_failed"));
        },
      },
    );
  };

  const row = (
    key: "name" | "email",
    label: string,
    toggleTestId: string,
    requiredTestId: string,
  ) => (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox
          checked={toggles[key].enabled}
          onCheckedChange={(c) =>
            persist({ ...toggles, [key]: { enabled: !!c, required: !!c && toggles[key].required } })
          }
          data-testid={toggleTestId}
        />
        {label}
      </label>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Checkbox
          checked={toggles[key].required}
          disabled={!toggles[key].enabled}
          onCheckedChange={(c) =>
            persist({ ...toggles, [key]: { ...toggles[key], required: !!c } })
          }
          data-testid={requiredTestId}
        />
        {t("intake.required_label")}
      </label>
    </div>
  );

  return (
    <div className="space-y-3" data-testid="test-editor-intake-root">
      <div>
        <Label className="text-sm font-medium">{t("intake.title")}</Label>
        <p className="mt-1 text-xs text-muted-foreground" data-testid="test-editor-intake-hint">
          {t("intake.hint")}
        </p>
      </div>
      {row(
        "name",
        t("intake.field_name"),
        "test-editor-intake-name-toggle",
        "test-editor-intake-name-required",
      )}
      {row(
        "email",
        t("intake.field_email"),
        "test-editor-intake-email-toggle",
        "test-editor-intake-email-required",
      )}
    </div>
  );
}
