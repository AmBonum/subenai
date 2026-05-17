import { useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Question } from "@/lib/platform/types";
import { tFor } from "@/i18n/respondent-flow";

interface QuestionStepProps {
  index: number;
  total: number;
  question: Question;
  initialValue: string;
  isLast: boolean;
  onPrev?: () => void;
  onAnswer: (value: string, advance: boolean) => void;
}

export function QuestionStep({
  index,
  total,
  question,
  initialValue,
  isLast,
  onPrev,
  onAnswer,
}: QuestionStepProps) {
  const t = tFor("questions");
  const [value, setValue] = useState(initialValue);

  return (
    <div className="space-y-4">
      <Progress value={((index + 1) / total) * 100} />
      <p className="text-xs text-muted-foreground">{t("progress", { n: index + 1, total })}</p>
      <Card>
        <CardContent className="space-y-4 p-6">
          <p
            className="text-base font-medium"
            data-testid={`respondent-flow-question-${index}-prompt`}
          >
            {question.prompt}
          </p>
          {question.options ? (
            <div className="space-y-2">
              {question.options.map((o, ai) => (
                <label
                  key={o}
                  className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted"
                  data-testid={`respondent-flow-question-${index}-answer-${ai}`}
                >
                  <input
                    type="radio"
                    name={`q-${index}`}
                    value={o}
                    checked={value === o}
                    onChange={() => setValue(o)}
                  />
                  {o}
                </label>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder={t("free_answer_placeholder")}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                data-testid={`respondent-flow-question-${index}-answer-input`}
              />
              <p className="text-xs text-muted-foreground">{t("free_answer_hint")}</p>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={!onPrev}
              data-testid="respondent-flow-prev-button"
              onClick={onPrev}
            >
              {t("prev_button")}
            </Button>
            {isLast ? (
              <Button
                type="button"
                data-testid="respondent-flow-submit-button"
                disabled={!value}
                onClick={() => onAnswer(value, true)}
              >
                {t("submit_button")}
              </Button>
            ) : (
              <Button
                type="button"
                data-testid="respondent-flow-next-button"
                disabled={!value}
                onClick={() => onAnswer(value, true)}
              >
                {t("next_button")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
