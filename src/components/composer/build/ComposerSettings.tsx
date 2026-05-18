import type { ChangeEvent } from "react";
import { COMPOSER_LIMITS } from "@/lib/quiz/composer";
import { tFor } from "@/i18n/quiz";

interface Props {
  passingThreshold: number;
  onThresholdChange: (next: number) => void;
  maxQuestions: number;
  onMaxQuestionsChange: (next: number) => void;
  selectedCount: number;
  honeypotRatio: number;
  creatorLabel: string;
  onCreatorLabelChange: (next: string) => void;
}

export function ComposerSettings({
  passingThreshold,
  onThresholdChange,
  maxQuestions,
  onMaxQuestionsChange,
  selectedCount,
  honeypotRatio,
  creatorLabel,
  onCreatorLabelChange,
}: Props) {
  const t = tFor("composer_settings");
  const thresholdTone =
    passingThreshold < 60
      ? "text-red-500"
      : passingThreshold < 70
        ? "text-amber-500"
        : "text-primary";

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="threshold-slider" className="text-sm font-semibold text-foreground">
            {t("threshold_label")}
          </label>
          <span className={`text-2xl font-black ${thresholdTone}`}>{passingThreshold}%</span>
        </div>
        <input
          id="threshold-slider"
          type="range"
          min={COMPOSER_LIMITS.minThreshold}
          max={COMPOSER_LIMITS.maxThreshold}
          step={5}
          value={passingThreshold}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onThresholdChange(Number(e.target.value))}
          aria-valuemin={COMPOSER_LIMITS.minThreshold}
          aria-valuemax={COMPOSER_LIMITS.maxThreshold}
          aria-valuenow={passingThreshold}
          className="mt-2 w-full accent-primary"
        />
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t("threshold_hint.prefix")}
          <strong>
            {passingThreshold}
            {t("threshold_hint.value_suffix")}
          </strong>
          {t("threshold_hint.suffix")}
        </p>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="max-slider" className="text-sm font-semibold text-foreground">
            {t("max_label")}
          </label>
          <span className="text-2xl font-black text-foreground">{maxQuestions}</span>
        </div>
        <input
          id="max-slider"
          type="range"
          min={COMPOSER_LIMITS.minQuestions}
          max={COMPOSER_LIMITS.maxQuestions}
          step={1}
          value={maxQuestions}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            onMaxQuestionsChange(Number(e.target.value))
          }
          aria-valuemin={COMPOSER_LIMITS.minQuestions}
          aria-valuemax={COMPOSER_LIMITS.maxQuestions}
          aria-valuenow={maxQuestions}
          className="mt-2 w-full accent-primary"
        />
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {t("max_hint.prefix")}
          <strong>{selectedCount}</strong>
          {t("max_hint.suffix")}
        </p>
      </div>

      <div>
        <label htmlFor="creator-label" className="text-sm font-semibold text-foreground">
          {t("creator_label")}{" "}
          <span className="text-xs font-normal text-muted-foreground">{t("creator_optional")}</span>
        </label>
        <input
          id="creator-label"
          type="text"
          value={creatorLabel}
          onChange={(e) =>
            onCreatorLabelChange(e.target.value.slice(0, COMPOSER_LIMITS.labelMaxLen))
          }
          maxLength={COMPOSER_LIMITS.labelMaxLen}
          placeholder={t("creator_placeholder")}
          className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {t("creator_remaining", { n: COMPOSER_LIMITS.labelMaxLen - creatorLabel.length })}
        </p>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t("honeypot_title")}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-foreground">
          <strong>
            {Math.round(honeypotRatio * 100)}
            {t("honeypot_body.value_suffix")}
          </strong>
          {t("honeypot_body.suffix")}
        </p>
      </div>
    </div>
  );
}
