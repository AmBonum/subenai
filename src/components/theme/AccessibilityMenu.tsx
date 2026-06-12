// Labels come from the marketing `a11y` namespace because it is
// eager-loaded — the menu renders in the public header and the /app
// shell without pulling a second i18n bundle (same as ThemeToggle).
import { ALargeSmall, Check, PersonStanding } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useAccessibility,
  type FontSize,
  type MotionPref,
} from "@/components/theme/AccessibilityProvider";
import { tFor } from "@/i18n/marketing";

const FONT_ORDER: FontSize[] = ["s", "m", "l", "xl"];
const MOTION_ORDER: MotionPref[] = ["system", "on", "off"];

type Variant = "ghost" | "outline";

export function AccessibilityMenu({
  variant = "ghost",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  const { fontSize, motion, setFontSize, setMotion } = useAccessibility();
  const t = tFor("a11y");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className={className}
          data-testid="a11y-menu-trigger"
          aria-label={t("menu_aria")}
        >
          <PersonStanding className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid="a11y-menu">
        <DropdownMenuLabel
          className="flex items-center gap-2 text-xs text-muted-foreground"
          data-testid="a11y-menu-font-label"
        >
          <ALargeSmall className="h-4 w-4" aria-hidden="true" />
          {t("font_label")}
        </DropdownMenuLabel>
        {FONT_ORDER.map((option) => {
          const active = option === fontSize;
          return (
            <DropdownMenuItem
              key={option}
              onSelect={() => setFontSize(option)}
              data-testid={`a11y-menu-font-${option}`}
              aria-current={active ? "true" : undefined}
            >
              <span className="flex-1">{t(`font_${option}`)}</span>
              {active && (
                <Check
                  className="ml-2 h-4 w-4"
                  aria-hidden="true"
                  data-testid={`a11y-menu-font-check-${option}`}
                />
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuLabel
          className="text-xs text-muted-foreground"
          data-testid="a11y-menu-motion-label"
        >
          {t("motion_label")}
        </DropdownMenuLabel>
        {MOTION_ORDER.map((option) => {
          const active = option === motion;
          return (
            <DropdownMenuItem
              key={option}
              onSelect={() => setMotion(option)}
              data-testid={`a11y-menu-motion-${option}`}
              aria-current={active ? "true" : undefined}
            >
              <span className="flex-1">{t(`motion_${option}`)}</span>
              {active && (
                <Check
                  className="ml-2 h-4 w-4"
                  aria-hidden="true"
                  data-testid={`a11y-menu-motion-check-${option}`}
                />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
