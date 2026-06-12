import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { IntakeField } from "@/lib/platform/types";
import { tFor } from "@/i18n/respondent-flow";

interface IntakeStepProps {
  intakeFields: IntakeField[];
  onSubmit: (intake: Record<string, string>, consent: boolean) => void;
}

export function IntakeStep({ intakeFields, onSubmit }: IntakeStepProps) {
  const t = tFor("intake");
  const [intake, setIntake] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!consent) {
      setError(t("consent_required"));
      return;
    }
    const missing = intakeFields.filter((f) => f.required && !intake[f.id]?.trim());
    if (missing.length) {
      setError(t("missing_required", { fields: missing.map((m) => m.label).join(", ") }));
      return;
    }
    setError(null);
    onSubmit(intake, consent);
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        {intakeFields.map((f) => (
          <div key={f.id} className="space-y-2">
            <Label htmlFor={`intake-${f.id}`}>
              {f.label}
              {f.required && <span className="text-destructive"> *</span>}{" "}
              {f.pii && (
                <Badge variant="outline" className="ml-1 text-[10px]">
                  PII
                </Badge>
              )}
            </Label>
            {f.type === "select" ? (
              <select
                id={`intake-${f.id}`}
                className="w-full rounded-md border bg-background p-2"
                value={intake[f.id] ?? ""}
                onChange={(e) => setIntake({ ...intake, [f.id]: e.target.value })}
                data-testid={
                  f.label.toLowerCase().includes("meno")
                    ? "respondent-flow-intake-name"
                    : `respondent-flow-intake-field-${f.id}`
                }
              >
                <option value="">—</option>
                {f.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                id={`intake-${f.id}`}
                type={
                  f.type === "email"
                    ? "email"
                    : f.type === "number"
                      ? "number"
                      : f.type === "date"
                        ? "date"
                        : "text"
                }
                value={intake[f.id] ?? ""}
                onChange={(e) => setIntake({ ...intake, [f.id]: e.target.value })}
                data-testid={
                  f.label.toLowerCase().includes("meno")
                    ? "respondent-flow-intake-name"
                    : f.type === "email"
                      ? "respondent-flow-intake-email"
                      : `respondent-flow-intake-field-${f.id}`
                }
              />
            )}
          </div>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={consent}
            onCheckedChange={(c) => setConsent(!!c)}
            data-testid="respondent-flow-intake-consent-checkbox"
          />
          {t("consent_label")}
        </label>
        {error && (
          <p
            className="text-sm text-destructive"
            role="alert"
            data-testid="respondent-flow-intake-error"
          >
            {error}
          </p>
        )}
        <Button
          onClick={submit}
          className="w-full"
          data-testid="respondent-flow-intake-submit-button"
        >
          {t("submit_button")}
        </Button>
      </CardContent>
    </Card>
  );
}
