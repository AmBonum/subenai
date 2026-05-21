// E45 Phase 2 — Settings tab card: set / change / clear test password.
//
// Server is the source of truth. We render one of three states based on
// `hasPassword`:
//   * !hasPassword + idle  → "set" mode (one input + Set button)
//   * !hasPassword + busy  → spinner on Set button
//   *  hasPassword + idle  → "set new" + "clear" actions
//
// Client-side validation: min 8 chars (matches the RPC's invariant —
// the RPC also enforces this, so the client check is purely UX, not
// security). No zxcvbn-lite in Phase 2 — deferred to Phase 4 polish.

import { useState } from "react";
import { KeyRound, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClearTestPassword, useSetTestPassword } from "@/lib/platform/queries";
import { tFor } from "@/i18n/tests";

interface Props {
  testId: string;
  hasPassword: boolean;
}

const MIN_LENGTH = 8;

export function PasswordCard({ testId, hasPassword }: Props) {
  const t = tFor("editor");
  const tP = (k: string, params?: Record<string, string | number>) =>
    t(`password.${k}` as never, params);

  const setMut = useSetTestPassword(testId);
  const clearMut = useClearTestPassword(testId);

  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);

  const tooShort = pwd.length > 0 && pwd.length < MIN_LENGTH;
  const mismatch = touched && confirm.length > 0 && pwd !== confirm;
  const canSubmit =
    pwd.length >= MIN_LENGTH && pwd === confirm && !setMut.isPending && !clearMut.isPending;

  const onSet = () => {
    if (!canSubmit) return;
    setMut.mutate(pwd, {
      onError: (err) => {
        // Surface RPC error keys verbatim — the keys are deterministic
        // ("password_too_short", "not_owner", "test_not_found").
        const key = err.message?.match(
          /(password_too_short|password_too_long|not_owner|test_not_found|unauthenticated|unexpected_hash_prefix)/,
        )?.[1];
        toast.error(key ? tP(`err_${key}` as never) : tP("set_failed"));
      },
      onSuccess: () => {
        toast.success(hasPassword ? tP("change_success") : tP("set_success"));
        setPwd("");
        setConfirm("");
        setTouched(false);
      },
    });
  };

  const onClear = () => {
    if (clearMut.isPending) return;
    clearMut.mutate(undefined, {
      onError: (err) => toast.error(err.message || tP("clear_failed")),
      onSuccess: () => {
        toast.success(tP("clear_success"));
        setPwd("");
        setConfirm("");
        setTouched(false);
      },
    });
  };

  return (
    <div className="space-y-3" data-testid="test-editor-password-root">
      <div className="flex items-start gap-2">
        {hasPassword ? (
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
        ) : (
          <ShieldX className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">{tP("label")}</Label>
          <p
            className="text-xs text-muted-foreground"
            data-testid="test-editor-password-status"
            data-has-password={hasPassword ? "true" : "false"}
          >
            {hasPassword ? tP("status_set") : tP("status_unset")}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ed-pwd" className="sr-only">
          {tP("input_label")}
        </Label>
        <Input
          id="ed-pwd"
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder={hasPassword ? tP("placeholder_change") : tP("placeholder_set")}
          autoComplete="new-password"
          data-testid="test-editor-password-input"
          aria-describedby="ed-pwd-hint"
        />
        <Input
          type="password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
            setTouched(true);
          }}
          placeholder={tP("placeholder_confirm")}
          autoComplete="new-password"
          data-testid="test-editor-password-confirm"
        />
        <p
          id="ed-pwd-hint"
          className={`text-xs ${
            tooShort || mismatch ? "text-destructive" : "text-muted-foreground"
          }`}
          data-testid="test-editor-password-hint"
          aria-live="polite"
        >
          {tooShort ? tP("err_too_short") : mismatch ? tP("err_mismatch") : tP("hint_min_length")}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {hasPassword && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClear}
            disabled={clearMut.isPending}
            data-testid="test-editor-password-clear-button"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {tP("clear_button")}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          onClick={onSet}
          disabled={!canSubmit}
          data-testid="test-editor-password-submit-button"
        >
          <KeyRound className="mr-2 h-3 w-3" />
          {hasPassword ? tP("change_button") : tP("set_button")}
        </Button>
      </div>
    </div>
  );
}
