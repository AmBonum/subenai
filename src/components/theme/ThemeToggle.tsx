// Labels come from the marketing `theme` namespace because it is
// eager-loaded — the toggle renders in the public header and the /app
// shell without pulling a second i18n bundle.
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, type Theme } from "@/components/theme/ThemeProvider";
import { tFor } from "@/i18n/marketing";

const ICONS: Record<Theme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

const ORDER: Theme[] = ["light", "dark", "system"];

type Variant = "ghost" | "outline";

export function ThemeToggle({
  variant = "ghost",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const t = tFor("theme");
  const TriggerIcon = ICONS[theme];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className={className}
          data-testid="theme-toggle-trigger"
          aria-label={t("aria_label")}
        >
          <TriggerIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid="theme-toggle-menu">
        {ORDER.map((option) => {
          const Icon = ICONS[option];
          const active = option === theme;
          return (
            <DropdownMenuItem
              key={option}
              onSelect={() => setTheme(option)}
              data-testid={`theme-toggle-option-${option}`}
              aria-current={active ? "true" : undefined}
            >
              <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
              <span className="flex-1">{t(option)}</span>
              {active && (
                <Check
                  className="ml-2 h-4 w-4"
                  aria-hidden="true"
                  data-testid={`theme-toggle-check-${option}`}
                />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
