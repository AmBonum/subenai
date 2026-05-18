import { useState } from "react";
import { ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSubmitDSR } from "@/lib/platform/queries";
import type { DSRType } from "@/lib/platform/types";
import { tFor } from "@/i18n/governance";

const TYPES: DSRType[] = [
  "access",
  "rectification",
  "erase",
  "restriction",
  "portability",
  "objection",
];

export function DsrSubmitForm() {
  const t = tFor("dsr_form");
  const submitMut = useSubmitDSR();
  const [email, setEmail] = useState("");
  const [type, setType] = useState<DSRType>("access");
  const [note, setNote] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    setSuccess(false);
    if (!email || !/.+@.+\..+/.test(email)) {
      setError(t("error_invalid_email"));
      return;
    }
    submitMut.mutate(
      { requester_email: email, type, note },
      {
        onSuccess: () => {
          setSuccess(true);
          setEmail("");
          setNote("");
        },
        onError: () => setError(t("error_generic")),
      },
    );
  };

  return (
    <Card data-testid="dsr-form-card">
      <CardHeader>
        <CardTitle>{t("card_title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {success && (
          <div
            className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700"
            data-testid="dsr-form-success-banner"
            role="status"
          >
            <CheckCircle2 className="h-4 w-4" />
            {t("success_banner")}
          </div>
        )}
        {error && (
          <div
            className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            data-testid="dsr-form-error-banner"
            role="alert"
          >
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="dsr-email">{t("email_label")}</Label>
          <Input
            id="dsr-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("email_placeholder")}
            data-testid="dsr-form-subject-input"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dsr-type">{t("type_label")}</Label>
          <Select value={type} onValueChange={(v) => setType(v as DSRType)}>
            <SelectTrigger id="dsr-type" data-testid="dsr-form-type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((tp) => (
                <SelectItem key={tp} value={tp} data-testid={`dsr-form-type-option-${tp}`}>
                  {t(`type.${tp}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dsr-note">{t("note_label")}</Label>
          <Textarea
            id="dsr-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("note_placeholder")}
            data-testid="dsr-form-details-textarea"
          />
        </div>
        <Button
          onClick={submit}
          disabled={submitMut.isPending}
          data-testid="dsr-form-submit-button"
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          {t("submit_button")}
        </Button>
      </CardContent>
    </Card>
  );
}
