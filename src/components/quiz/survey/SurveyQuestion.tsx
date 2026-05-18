import type { SurveyOption } from "@/lib/quiz/survey/index";
import { tFor } from "@/i18n/quiz";

/**
 * Declarative survey question — covers the four shapes our growth survey
 * uses. Controlled component (caller owns value/onChange). Caller computes
 * `error` from its own validation state and we render it inline.
 *
 * @example
 *   <SurveyQuestion
 *     type="single"
 *     label="Pohlavie"
 *     options={[{ id: "m", label: "Muž" }, { id: "z", label: "Žena" }]}
 *     value={gender}
 *     onChange={setGender}
 *   />
 *
 * @example
 *   <SurveyQuestion
 *     type="multi"
 *     label="Aké témy ťa zaujímajú?"
 *     options={INTEREST_OPTIONS}
 *     value={interests}
 *     onChange={setInterests}
 *   />
 *
 * @example
 *   <SurveyQuestion
 *     type="yesno"
 *     label="Chceš dostávať info o nových kurzoch?"
 *     value={wantsCourses}
 *     onChange={setWantsCourses}
 *   />
 *
 * @example
 *   <SurveyQuestion
 *     type="text"
 *     label="Mesto"
 *     value={city}
 *     onChange={setCity}
 *     maxLength={80}
 *     placeholder="napr. Košice"
 *   />
 */
type SharedProps = {
  label: string;
  /** Render an asterisk after the label and `aria-required` on the control. */
  required?: boolean;
  /** Inline destructive-coloured message under the field. */
  error?: string;
  /** Quiet helper text under the label (above the control). */
  hint?: string;
};

export type SurveyQuestionProps =
  | (SharedProps & {
      type: "single";
      options: SurveyOption[];
      value: string;
      onChange: (v: string) => void;
    })
  | (SharedProps & {
      type: "multi";
      options: SurveyOption[];
      value: string[];
      onChange: (v: string[]) => void;
      /** Visual hint only — caller still owns the actual `error` string. */
      minSelections?: number;
    })
  | (SharedProps & {
      type: "yesno";
      value: boolean | null;
      onChange: (v: boolean) => void;
    })
  | (SharedProps & {
      type: "text";
      value: string;
      onChange: (v: string) => void;
      maxLength?: number;
      placeholder?: string;
    });

export function SurveyQuestion(props: SurveyQuestionProps) {
  const { label, required, error, hint } = props;
  const errorId = error ? `sq-${slug(label)}-err` : undefined;

  return (
    <div>
      <Label text={label} required={required} />
      {hint && <div className="mt-0.5 text-xs text-foreground/55">{hint}</div>}
      <div className="mt-2">{renderControl(props, errorId)}</div>
      {error && (
        <div id={errorId} className="mt-1.5 text-xs text-destructive" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-foreground/70">
      {text}
      {required && (
        <span aria-hidden className="ml-0.5 text-destructive">
          *
        </span>
      )}
    </label>
  );
}

function renderControl(props: SurveyQuestionProps, errorId?: string): React.ReactNode {
  switch (props.type) {
    case "single":
      return <SingleSelect {...props} errorId={errorId} />;
    case "multi":
      return <MultiSelect {...props} errorId={errorId} />;
    case "yesno":
      return <YesNo {...props} errorId={errorId} />;
    case "text":
      return <TextInput {...props} errorId={errorId} />;
  }
}

function SingleSelect({
  options,
  value,
  onChange,
  required,
  errorId,
}: Extract<SurveyQuestionProps, { type: "single" }> & { errorId?: string }) {
  return (
    <div
      role="radiogroup"
      aria-required={required ? "true" : undefined}
      aria-describedby={errorId}
      className="flex flex-wrap gap-2"
    >
      {options.map((o) => {
        const selected = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(selected ? "" : o.id)}
            className={chipClass(selected)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function MultiSelect({
  options,
  value,
  onChange,
  required,
  errorId,
}: Extract<SurveyQuestionProps, { type: "multi" }> & { errorId?: string }) {
  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }
  return (
    <div
      role="group"
      aria-required={required ? "true" : undefined}
      aria-describedby={errorId}
      className="flex flex-wrap gap-2"
    >
      {options.map((o) => {
        const selected = value.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={selected}
            onClick={() => toggle(o.id)}
            className={chipClass(selected)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function YesNo({
  value,
  onChange,
  required,
  errorId,
}: Extract<SurveyQuestionProps, { type: "yesno" }> & { errorId?: string }) {
  const tCommon = tFor("common");
  return (
    <div
      role="radiogroup"
      aria-required={required ? "true" : undefined}
      aria-describedby={errorId}
      className="grid grid-cols-2 gap-2"
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === true}
        onClick={() => onChange(true)}
        className={`h-10 rounded-lg border text-sm font-bold transition-colors ${
          value === true
            ? "border-primary bg-primary/15 text-primary"
            : "border-border text-foreground/70 hover:border-primary/50"
        }`}
      >
        {tCommon("yes_capital")}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === false}
        onClick={() => onChange(false)}
        className={`h-10 rounded-lg border text-sm font-bold transition-colors ${
          value === false
            ? "border-primary bg-primary/15 text-primary"
            : "border-border text-foreground/70 hover:border-primary/50"
        }`}
      >
        {tCommon("no_capital")}
      </button>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  maxLength,
  placeholder,
  required,
  error,
  errorId,
}: Extract<SurveyQuestionProps, { type: "text" }> & { errorId?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={maxLength}
      placeholder={placeholder}
      aria-required={required ? "true" : undefined}
      aria-invalid={error ? "true" : undefined}
      aria-describedby={errorId}
      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
    />
  );
}

function chipClass(selected: boolean): string {
  return `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
    selected
      ? "border-primary bg-primary/15 text-primary"
      : "border-border text-foreground/70 hover:border-primary/50"
  }`;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
