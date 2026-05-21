// E45 Phase 3 — invite-by-email dialog for the test detail page.
//
// Owner pastes/types a list of recipients (textarea, comma/newline-separated),
// optionally checks "include password" (D7 — defaults OFF; if ON, an
// inline password field is required so we can verify it against the
// current hash server-side before shipping), and submits.
//
// The server endpoint (functions/api/tests/send-invites) enforces 3
// rate-limit layers + 50/send cap. On partial-success the UI surfaces
// "Posielané: N, Zlyhalo: M" + an option to retry the failed batch.

import { useMemo, useState } from "react";
import { AlertTriangle, KeyRound, Mail, Send, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { tFor } from "@/i18n/tests";

interface Props {
  open: boolean;
  onClose: () => void;
  testId: string;
  hasPassword: boolean;
}

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENTS = 50;

function parseRecipients(raw: string): { valid: string[]; invalid: string[] } {
  const tokens = raw
    .split(/[\s,;]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const t of tokens) {
    if (seen.has(t)) continue;
    seen.add(t);
    if (EMAIL_RX.test(t)) valid.push(t);
    else invalid.push(t);
  }
  return { valid, invalid };
}

interface SendResponse {
  ok?: true;
  sent?: number;
  failed?: number;
  error?: string;
  retry_after?: number;
}

export function InviteEmailDialog({ open, onClose, testId, hasPassword }: Props) {
  const t = tFor("editor");
  const tI = (k: string, params?: Record<string, string | number>) =>
    t(`invite.${k}` as never, params);

  const [recipientsText, setRecipientsText] = useState("");
  const [includePassword, setIncludePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parsed = useMemo(() => parseRecipients(recipientsText), [recipientsText]);
  const overCap = parsed.valid.length > MAX_RECIPIENTS;
  const canSubmit =
    !submitting &&
    parsed.valid.length > 0 &&
    !overCap &&
    (!includePassword || password.length >= 8);

  const reset = () => {
    setRecipientsText("");
    setIncludePassword(false);
    setPassword("");
    setSubmitting(false);
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) {
        toast.error(tI("err_not_signed_in"));
        return;
      }
      const res = await fetch("/api/tests/send-invites", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          test_id: testId,
          recipients: parsed.valid,
          include_password: includePassword,
          ...(includePassword ? { password } : {}),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as SendResponse;

      if (res.status === 429) {
        const key = body.error ?? "rate_limited";
        toast.error(tI(`err_${key}` as never));
        return;
      }
      if (res.status !== 200) {
        const key = body.error ?? "send_failed";
        toast.error(tI(`err_${key}` as never));
        return;
      }
      const sent = body.sent ?? 0;
      const failed = body.failed ?? 0;
      if (failed === 0) {
        toast.success(tI("success_all", { count: sent }));
        reset();
        onClose();
      } else {
        toast.warning(tI("success_partial", { sent, failed }));
      }
    } catch {
      toast.error(tI("err_send_failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent
        className="flex max-h-[92vh] flex-col gap-3 sm:max-w-lg"
        data-testid="test-editor-invite-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" aria-hidden />
            {tI("title")}
          </DialogTitle>
          <DialogDescription>{tI("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="invite-recipients" className="text-xs">
            {tI("recipients_label")}
          </Label>
          <Textarea
            id="invite-recipients"
            value={recipientsText}
            onChange={(e) => setRecipientsText(e.target.value)}
            placeholder={tI("recipients_placeholder")}
            rows={5}
            data-testid="test-editor-invite-recipients-input"
            aria-describedby="invite-recipients-summary"
          />
          <p
            id="invite-recipients-summary"
            className={`text-xs ${overCap ? "text-destructive" : "text-muted-foreground"}`}
            data-testid="test-editor-invite-summary"
            aria-live="polite"
          >
            {tI("summary", {
              valid: parsed.valid.length,
              invalid: parsed.invalid.length,
              max: MAX_RECIPIENTS,
            })}
          </p>
          {parsed.invalid.length > 0 && (
            <p
              className="text-xs text-amber-700"
              data-testid="test-editor-invite-invalid"
              role="status"
            >
              {tI("invalid_hint", { example: parsed.invalid.slice(0, 3).join(", ") })}
            </p>
          )}
        </div>

        {hasPassword && (
          <div className="space-y-2 rounded-md border border-amber-300/60 bg-amber-50/40 p-3">
            <label
              className="flex cursor-pointer items-start gap-2 text-xs"
              htmlFor="invite-include-password"
            >
              <Checkbox
                id="invite-include-password"
                checked={includePassword}
                onCheckedChange={(v) => setIncludePassword(v === true)}
                data-testid="test-editor-invite-include-password-checkbox"
              />
              <span className="space-y-0.5">
                <span className="block font-medium text-foreground">
                  {tI("include_password_label")}
                </span>
                <span className="block text-muted-foreground">{tI("include_password_hint")}</span>
              </span>
            </label>
            {includePassword && (
              <div className="space-y-1.5">
                <Label htmlFor="invite-password" className="sr-only">
                  {tI("password_label")}
                </Label>
                <div className="relative">
                  <KeyRound
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="invite-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tI("password_placeholder")}
                    autoComplete="off"
                    className="pl-9"
                    data-testid="test-editor-invite-password-input"
                  />
                </div>
                <p className="flex items-start gap-1.5 text-[11px] text-amber-800">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                  <span>{tI("include_password_warning")}</span>
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              reset();
              onClose();
            }}
            data-testid="test-editor-invite-cancel"
          >
            <X className="mr-2 h-3 w-3" aria-hidden />
            {tI("cancel")}
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit} data-testid="test-editor-invite-submit">
            <Send className="mr-2 h-3 w-3" aria-hidden />
            {submitting ? tI("submitting") : tI("submit", { count: parsed.valid.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
