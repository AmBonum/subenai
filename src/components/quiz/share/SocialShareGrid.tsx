import { useState, type ReactNode } from "react";
import {
  buildShareIntentUrl,
  isMobileUserAgent,
  SHARE_PLATFORMS,
  withUtm,
  type SharePlatform,
} from "@/lib/share/intents";
import { tFor } from "@/i18n/quiz";

interface Props {
  url: string;
  text: string;
}

/**
 * Grid of plain `window.open` share-intent buttons. No 3rd-party SDK or
 * tracking pixel is loaded — each click opens the platform's own share
 * dialog with the URL + caption pre-filled. UTM params are appended at the
 * helper level so analytics (when wired) can attribute the source.
 *
 * Messenger is special-cased: there is no public web share dialog without a
 * registered Facebook App ID. On mobile we fire the `fb-messenger://`
 * deep link; on desktop we copy the caption + URL to the clipboard and show
 * a toast — honest UX over a misleading FB redirect.
 */
export function SocialShareGrid({ url, text }: Props) {
  const t = tFor("social");
  const [messengerCopied, setMessengerCopied] = useState(false);

  async function handleClick(platform: SharePlatform) {
    if (platform === "messenger" && !isMobileUserAgent()) {
      const utmUrl = withUtm(url, "messenger");
      try {
        await navigator.clipboard.writeText(`${text} ${utmUrl}`);
        setMessengerCopied(true);
        window.setTimeout(() => setMessengerCopied(false), 2400);
      } catch {
        // Clipboard write can throw in insecure contexts; fall through to
        // the deep-link attempt so something still happens.
        window.open(buildShareIntentUrl("messenger", url, text), "_blank");
      }
      return;
    }

    const intentUrl = buildShareIntentUrl(platform, url, text);
    window.open(intentUrl, "_blank", "noopener,noreferrer,width=600,height=600");
  }

  return (
    <div className="mt-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("or_share")}</div>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {SHARE_PLATFORMS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => handleClick(p.id)}
            aria-label={t("share_aria", { platform: p.label })}
            className="group flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card px-2 py-3 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/60 hover:text-foreground"
          >
            <span aria-hidden className={`text-foreground/70 ${p.brandHover}`}>
              {ICONS[p.id]}
            </span>
            <span>{p.label}</span>
          </button>
        ))}
      </div>
      {messengerCopied && (
        <div
          role="status"
          aria-live="polite"
          className="mt-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-foreground"
        >
          {t("messenger_copied")}
        </div>
      )}
    </div>
  );
}

// 24×24 viewBox SVGs, currentColor, no external font/icon set. Bundle delta
// stays in the low-KB range. Marks aria-hidden on the wrapper.
const ICONS: Record<SharePlatform, ReactNode> = {
  facebook: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.25-1.5 1.55-1.5h1.65V4.7c-.29-.04-1.27-.12-2.4-.12-2.38 0-4 1.45-4 4.12v2.2H7.6V14h2.7v8h3.2z" />
    </svg>
  ),
  messenger: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.13 2 11.22c0 2.86 1.42 5.4 3.66 7.07V22l3.34-1.83c.91.25 1.88.39 2.9.39 5.52 0 10-4.13 10-9.22S17.52 2 12 2zm1.05 12.34l-2.55-2.72-4.96 2.72 5.45-5.78 2.6 2.72 4.91-2.72-5.45 5.78z" />
    </svg>
  ),
  whatsapp: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.88 1.21 3.07.15.2 2.09 3.18 5.06 4.46.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.81-1.32l-.34-.21-3.58.94.95-3.49-.22-.36A9.36 9.36 0 0 1 2.5 12c0-5.18 4.22-9.4 9.42-9.4 2.52 0 4.88.98 6.66 2.76a9.34 9.34 0 0 1 2.76 6.65c0 5.18-4.22 9.4-9.4 9.4z" />
    </svg>
  ),
  x: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2H21.5l-7.06 8.07L22.66 22h-6.55l-5.13-6.7L4.97 22H1.71l7.55-8.62L1.59 2h6.71l4.64 6.13L18.244 2zm-2.3 18.13h1.81L7.16 3.79H5.22l10.72 16.34z" />
    </svg>
  ),
  linkedin: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM8.34 18H5.67v-8.5h2.67V18zm-1.34-9.67a1.55 1.55 0 1 1 0-3.1 1.55 1.55 0 0 1 0 3.1zM18.34 18h-2.67v-4.13c0-1-.02-2.27-1.39-2.27-1.39 0-1.6 1.08-1.6 2.2V18H10V9.5h2.56v1.17h.04c.36-.67 1.22-1.38 2.51-1.38 2.69 0 3.18 1.77 3.18 4.07V18z" />
    </svg>
  ),
  telegram: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19l-9.49 5.99-4.1-1.28c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71l-4.07-3-1.96 1.91c-.23.23-.42.42-.83.42z" />
    </svg>
  ),
};
