// AH-15.1 — globe-icon dropdown that switches the active UI locale.
//
// TEMPORARILY DISABLED (2026-05-19): the en + cs translations are all in
// place and tFor() keeps resolving them, but the UI affordance is hidden
// while we finalise copy + run UX research. To re-enable: delete the early
// `return null` below + the matching `readInitialLocale` / `setLocale`
// short-circuits in `locale-context.tsx`. No other code changes needed —
// resolver + lazy locale bundles + every translated string stay intact.
//
// Visible labels stay native (Slovenčina / English / Čeština) regardless of
// the current locale: that's how language pickers idiomatically render
// (otherwise an English-only speaker who landed on a Slovak page can't find
// "English" in the list).
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, useLocale, type Locale } from "@/i18n/locale-context";
import { tFor } from "@/i18n/marketing";

// Feature flag — flip to `true` to re-enable the language picker in the UI.
const LOCALE_SWITCHER_ENABLED = false;

const LABELS: Record<Locale, { name: string; flag: string }> = {
  sk: { name: "Slovenčina", flag: "🇸🇰" },
  en: { name: "English", flag: "🇬🇧" },
  cs: { name: "Čeština", flag: "🇨🇿" },
};

type Variant = "ghost" | "outline";

export function LocaleSwitcher({
  variant = "ghost",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  const { locale, setLocale } = useLocale();
  const current = LABELS[locale];
  const t = tFor("locale_switcher");
  if (!LOCALE_SWITCHER_ENABLED) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className={className}
          data-testid="locale-switcher-trigger"
          aria-label={t("aria_label")}
        >
          <Globe className="h-4 w-4" aria-hidden="true" />
          <span className="ml-1 hidden sm:inline" data-testid="locale-switcher-current">
            {current.flag} {current.name}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid="locale-switcher-menu">
        {LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onSelect={() => setLocale(loc)}
            data-testid={`locale-switcher-option-${loc}`}
            aria-current={loc === locale ? "true" : undefined}
          >
            <span className="mr-2" aria-hidden="true">
              {LABELS[loc].flag}
            </span>
            {LABELS[loc].name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
