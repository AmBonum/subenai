import { tFor } from "@/i18n/marketing";

// First focusable element on every surface (public chrome, /app shell,
// /admin shell). Visually hidden until keyboard focus lands on it; jumps
// to the `id="main"` content container rendered by the owning layout.
export function SkipToContentLink() {
  const t = tFor("a11y");
  return (
    <a
      href="#main"
      data-testid="skip-to-content-link"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-xl focus:border focus:border-border focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-foreground focus:shadow-card"
    >
      {t("skip_to_content")}
    </a>
  );
}
