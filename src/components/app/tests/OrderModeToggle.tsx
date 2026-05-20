// E45 Phase 1 — Settings card: pick fixed vs random question order.
//
// Server is the source of truth — the toggle is a controlled component
// driven by props, mutates on change. No local copy of the value so a
// failed mutation doesn't strand the UI in a wrong state.

import { Shuffle, ListOrdered } from "lucide-react";
import { toast } from "sonner";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUpdateTestOrderMode } from "@/lib/platform/queries";
import { tFor } from "@/i18n/tests";

interface Props {
  testId: string;
  value: "fixed" | "random";
}

export function OrderModeToggle({ testId, value }: Props) {
  const t = tFor("editor");
  const tO = (k: string) => t(`order_mode.${k}` as never);
  const updateMut = useUpdateTestOrderMode(testId);

  const onChange = (next: string) => {
    if (next !== "fixed" && next !== "random") return;
    if (next === value) return;
    updateMut.mutate(next, {
      onError: (err) => toast.error(err.message || tO("update_failed")),
      onSuccess: () => toast.success(tO("update_success")),
    });
  };

  return (
    <div className="space-y-3" data-testid="test-editor-order-mode-root">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{tO("label")}</Label>
        <p className="text-xs text-muted-foreground">{tO("hint")}</p>
      </div>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        disabled={updateMut.isPending}
        className="grid gap-2 sm:grid-cols-2"
      >
        <label
          htmlFor="order-mode-fixed"
          data-testid="test-editor-order-mode-option-fixed"
          className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 transition-colors ${
            value === "fixed" ? "border-primary bg-primary/5" : "border-border/60"
          }`}
        >
          <RadioGroupItem
            id="order-mode-fixed"
            value="fixed"
            data-testid="test-editor-order-mode-radio-fixed"
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <ListOrdered className="h-3.5 w-3.5" aria-hidden />
              {tO("fixed_title")}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{tO("fixed_body")}</p>
          </div>
        </label>
        <label
          htmlFor="order-mode-random"
          data-testid="test-editor-order-mode-option-random"
          className={`flex cursor-pointer items-start gap-2 rounded-md border p-3 transition-colors ${
            value === "random" ? "border-primary bg-primary/5" : "border-border/60"
          }`}
        >
          <RadioGroupItem
            id="order-mode-random"
            value="random"
            data-testid="test-editor-order-mode-radio-random"
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Shuffle className="h-3.5 w-3.5" aria-hidden />
              {tO("random_title")}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{tO("random_body")}</p>
          </div>
        </label>
      </RadioGroup>
    </div>
  );
}
