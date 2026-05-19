import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { tFor } from "@/i18n/auth";

export const Route = createLazyFileRoute("/app/onboarding")({
  component: OnboardingPage,
});

type AudienceKind = "class" | "colleagues" | "clients" | "other";
type DigestCadence = "weekly" | "monthly" | "off";

const SCAM_INTERESTS = [
  "phishing",
  "voice_clone",
  "marketplace",
  "investment",
  "romance",
  "tech_support",
  "delivery",
  "deepfake",
] as const;
type ScamInterest = (typeof SCAM_INTERESTS)[number];

function OnboardingPage() {
  const t = tFor("onboarding");
  const navigate = useNavigate();
  const [audience, setAudience] = useState<AudienceKind | "">("");
  const [interests, setInterests] = useState<ScamInterest[]>([]);
  const [cadence, setCadence] = useState<DigestCadence>("weekly");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleInterest = (key: ScamInterest, checked: boolean) => {
    setInterests((prev) => (checked ? [...prev, key] : prev.filter((k) => k !== key)));
  };

  const persist = async (payload: {
    audience_kind: AudienceKind | null;
    scam_interests: ScamInterest[];
    digest_cadence: DigestCadence;
  }) => {
    setError(null);
    setSubmitting(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        await navigate({ to: "/login" });
        return;
      }
      const { error: upsertError } = await supabase.from("profile_preferences").upsert(
        {
          user_id: session.user.id,
          audience_kind: payload.audience_kind,
          scam_interests: payload.scam_interests,
          digest_cadence: payload.digest_cadence,
          onboarded_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (upsertError) {
        setError(t("error_generic"));
        return;
      }
      await navigate({ to: "/app" });
    } catch {
      setError(t("error_generic"));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await persist({
      audience_kind: audience === "" ? null : audience,
      scam_interests: interests,
      digest_cadence: cadence,
    });
  };

  const onSkip = async () => {
    await persist({
      audience_kind: null,
      scam_interests: [],
      digest_cadence: "weekly",
    });
  };

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-background px-4 py-12"
      data-testid="onboarding-root"
    >
      <Card className="w-full max-w-xl" data-testid="onboarding-card">
        <CardHeader>
          <CardTitle data-testid="onboarding-heading">{t("heading")}</CardTitle>
          <CardDescription data-testid="onboarding-subheading">{t("subheading")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-8" data-testid="onboarding-form" noValidate>
            <fieldset className="space-y-3" data-testid="onboarding-q1">
              <legend className="text-base font-medium">{t("q1_label")}</legend>
              <RadioGroup
                value={audience}
                onValueChange={(v) => setAudience(v as AudienceKind)}
                className="grid gap-2"
              >
                {(["class", "colleagues", "clients", "other"] as const).map((k) => (
                  <div key={k} className="flex items-center gap-2">
                    <RadioGroupItem
                      value={k}
                      id={`onboarding-q1-${k}`}
                      data-testid={`onboarding-q1-${k}`}
                    />
                    <Label htmlFor={`onboarding-q1-${k}`}>{t(`q1_${k}`)}</Label>
                  </div>
                ))}
              </RadioGroup>
            </fieldset>

            <fieldset className="space-y-3" data-testid="onboarding-q2">
              <legend className="text-base font-medium">{t("q2_label")}</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {SCAM_INTERESTS.map((k) => {
                  const checked = interests.includes(k);
                  return (
                    <label
                      key={k}
                      className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      data-testid={`onboarding-q2-${k}-label`}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => toggleInterest(k, v === true)}
                        data-testid={`onboarding-q2-${k}`}
                      />
                      <span>{t(`q2_${k}`)}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="space-y-3" data-testid="onboarding-q3">
              <legend className="text-base font-medium">{t("q3_label")}</legend>
              <Select value={cadence} onValueChange={(v) => setCadence(v as DigestCadence)}>
                <SelectTrigger data-testid="onboarding-q3-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly" data-testid="onboarding-q3-weekly">
                    {t("q3_weekly")}
                  </SelectItem>
                  <SelectItem value="monthly" data-testid="onboarding-q3-monthly">
                    {t("q3_monthly")}
                  </SelectItem>
                  <SelectItem value="off" data-testid="onboarding-q3-off">
                    {t("q3_off")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </fieldset>

            {error && (
              <p
                className="text-sm text-destructive"
                role="alert"
                data-testid="onboarding-error-message"
              >
                {error}
              </p>
            )}

            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onSkip}
                disabled={submitting}
                data-testid="onboarding-skip-button"
              >
                {t("skip")}
              </Button>
              <Button type="submit" disabled={submitting} data-testid="onboarding-submit-button">
                {submitting ? t("submitting") : t("submit")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
