// DESIGN INVARIANT: this component MUST NOT call fetch / supabase.* /
// localStorage.setItem with field values. The only permitted localStorage
// write is `iiq_trap_seen = "1"`. Tests in
// tests/components/TrapDialog.test.tsx enforce this contract — breaking it
// breaks the privacy promise rendered in /privacy §2.

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SENSITIVITY_BADGE,
  SENSITIVITY_BORDER,
  SENSITIVITY_LABEL,
  TRAP_FIELDS,
  TRAP_SEEN_STORAGE_KEY,
  type TrapFieldCopy,
} from "@/lib/data-trap/copy";
import { matchers, type TrapFieldId } from "@/lib/data-trap/matchers";
import { useConsent } from "@/hooks/useConsent";
import { track } from "@/lib/browser/tracking";
import { tFor } from "@/i18n/quiz";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcknowledged?: () => void;
}

export function TrapDialog({ open, onOpenChange, onAcknowledged }: Props) {
  const t = tFor("trap");
  const { record } = useConsent();
  const [values, setValues] = useState<Record<TrapFieldId, string>>(() => emptyValues());
  // Once a field has matched, we keep the warning visible even if the user
  // edits the value back to a non-matching state. The lesson is "you tried
  // it" — undoing the typo doesn't undo the lesson.
  const [warned, setWarned] = useState<Record<TrapFieldId, boolean>>(() => emptyFlags());
  // Per-field "already tracked" guard so a single keystroke pattern doesn't
  // fire 10 events while the user keeps typing.
  const trackedRef = useRef<Record<TrapFieldId, boolean>>(emptyFlags());

  // Reset field state every time the dialog reopens — the trap is
  // single-shot per session-of-attention. Keeping stale values would let a
  // user re-open and see their previous attempt, which weakens the
  // educational reset.
  useEffect(() => {
    if (open) {
      setValues(emptyValues());
      setWarned(emptyFlags());
      trackedRef.current = emptyFlags();
    }
  }, [open]);

  function handleChange(id: TrapFieldId, value: string) {
    setValues((prev) => ({ ...prev, [id]: value }));
    if (matchers[id](value)) {
      setWarned((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
      if (!trackedRef.current[id]) {
        trackedRef.current[id] = true;
        const field = TRAP_FIELDS.find((f) => f.id === id);
        track(record, {
          name: "data_trap.field_warned",
          category: "analytics",
          properties: {
            field_id: id,
            sensitivity: field?.sensitivity,
          },
        });
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{t("title")}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {t("description.prefix")}
            <strong>{t("description.strong")}</strong>
            {t("description.suffix")}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-5">
          {TRAP_FIELDS.map((field) => (
            <FieldBlock
              key={field.id}
              field={field}
              value={values[field.id]}
              warned={warned[field.id]}
              onChange={(v) => handleChange(field.id, v)}
            />
          ))}
        </div>

        <DialogFooter className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <p className="flex-1 text-xs text-muted-foreground">{t("footer_note")}</p>
          <button
            type="button"
            onClick={() => {
              onAcknowledged?.();
              onOpenChange(false);
            }}
            className="rounded-xl bg-accent-gradient px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
          >
            {t("acknowledge")}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface FieldBlockProps {
  field: TrapFieldCopy;
  value: string;
  warned: boolean;
  onChange: (value: string) => void;
}

function FieldBlock({ field, value, warned, onChange }: FieldBlockProps) {
  const inputId = `trap-${field.id}`;
  const warningId = warned ? `trap-${field.id}-warning` : undefined;
  return (
    <div>
      <label htmlFor={inputId} className="block text-xs font-medium text-foreground/70">
        {field.label}
      </label>
      <input
        id={inputId}
        type={field.inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={field.maxLength}
        placeholder={field.placeholder}
        autoComplete="off"
        spellCheck={false}
        aria-describedby={warningId}
        aria-invalid={warned ? "true" : undefined}
        className={`mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm transition-colors ${
          warned ? SENSITIVITY_BORDER[field.sensitivity] : "border-border"
        }`}
      />
      {warned && (
        <div
          id={warningId}
          role="alert"
          className={`mt-2 rounded-lg border-2 p-3 ${SENSITIVITY_BORDER[field.sensitivity]} bg-card`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${SENSITIVITY_BADGE[field.sensitivity]}`}
            >
              {SENSITIVITY_LABEL[field.sensitivity]}
            </span>
            <span className="text-sm font-bold text-foreground">{field.warningTitle}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80">{field.warningBody}</p>
        </div>
      )}
    </div>
  );
}

function emptyValues(): Record<TrapFieldId, string> {
  return {
    birth_number: "",
    card_number: "",
    card_cvv: "",
    iban: "",
    password: "",
    otp_code: "",
  };
}

function emptyFlags(): Record<TrapFieldId, boolean> {
  return {
    birth_number: false,
    card_number: false,
    card_cvv: false,
    iban: false,
    password: false,
    otp_code: false,
  };
}
