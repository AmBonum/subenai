import { useEffect, useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";

interface Props {
  /** Where to navigate when there is no in-app history to go back to. */
  fallbackTo: string;
  /** Label rendered when we can use history.back() (e.g. "← Späť"). */
  backLabel: string;
  /** Label rendered when we fall back to fallbackTo (e.g. "← Späť na domov"). */
  fallbackLabel: string;
  /** Stable data-testid for tests. */
  testId: string;
  className?: string;
}

/**
 * Smart back navigation: pops the router history when the user arrived
 * via an in-app navigation, otherwise links to a fallback (typically home).
 *
 * Decides client-side only — SSR always renders the safe fallback link so
 * markup is deterministic and the Cloudflare worker doesn't read `window`.
 */
export function SmartBackLink({ fallbackTo, backLabel, fallbackLabel, testId, className }: Props) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Two signals: prior router history OR same-origin referrer. Either
    // means popping history will land the user somewhere meaningful
    // (the page they came from) rather than the browser's new-tab page.
    // Check referrer against the *current* origin — works in dev
    // (localhost), preview branches (pages.dev), and prod (subenai.sk).
    const sameOriginReferrer =
      typeof document !== "undefined" &&
      typeof window !== "undefined" &&
      document.referrer.length > 0 &&
      document.referrer.startsWith(window.location.origin);
    const hasHistory = typeof window !== "undefined" && window.history.length > 1;
    setCanGoBack(sameOriginReferrer || hasHistory);
  }, []);

  if (!canGoBack) {
    return (
      <Link to={fallbackTo} data-testid={testId} className={className}>
        {fallbackLabel}
      </Link>
    );
  }

  return (
    <button
      type="button"
      data-testid={testId}
      onClick={() => router.history.back()}
      className={className}
    >
      {backLabel}
    </button>
  );
}
