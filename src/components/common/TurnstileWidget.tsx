import { useEffect, useRef } from "react";

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
      "timeout-callback"?: () => void;
      theme?: "light" | "dark" | "auto";
    },
  ): string;
  reset(widgetId?: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void;
  theme?: "light" | "dark" | "auto";
  siteKey?: string;
}

export function TurnstileWidget({
  onToken,
  theme = "dark",
  siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) {
      onToken("disabled");
      return;
    }
    let cancelled = false;
    let scriptEl: HTMLScriptElement | null = null;

    function ensureScript(): Promise<void> {
      if (window.turnstile) return Promise.resolve();
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${TURNSTILE_SCRIPT_SRC}"]`,
      );
      if (existing) {
        return new Promise((resolve) =>
          existing.addEventListener("load", () => resolve(), { once: true }),
        );
      }
      return new Promise((resolve, reject) => {
        scriptEl = document.createElement("script");
        scriptEl.src = TURNSTILE_SCRIPT_SRC;
        scriptEl.async = true;
        scriptEl.defer = true;
        scriptEl.addEventListener("load", () => resolve());
        scriptEl.addEventListener("error", () => reject(new Error("turnstile_script_failed")));
        document.head.appendChild(scriptEl);
      });
    }

    ensureScript()
      .then(() => {
        if (cancelled || !window.turnstile || !containerRef.current) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          callback: (token) => onToken(token),
          "expired-callback": () => onToken(null),
          "timeout-callback": () => onToken(null),
          "error-callback": () => onToken(null),
        });
      })
      .catch(() => {
        if (!cancelled) onToken(null);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // widget may already be gone on unmount
        }
        widgetIdRef.current = null;
      }
    };
    // onToken intentionally excluded — callers pass stable callbacks (useState setter)
    // or arrow fns; re-mounting on every render would thrash the Turnstile iframe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, theme]);

  return <div ref={containerRef} data-testid="turnstile-widget-container" />;
}
