import { useState } from "react";
import { Play, ExternalLink, Volume2 } from "lucide-react";
import { type AudioEmbed, youtubeId } from "@/lib/academy/audio-shortcode";
import { tFor } from "@/i18n/quiz";

// E61 — renders a reference to an external scam-call recording. Privacy-first:
// for a YouTube source the heavy iframe mounts only after the reader clicks
// play (no youtube-nocookie request, no cookies, until then). An external
// source renders a link-out card — we never proxy or rehost the audio.
//
// `compact` is used inside a test question (E62), where vertical space and
// visual weight must stay minimal.

export function ScamAudioEmbed({
  embed,
  compact = false,
}: {
  embed: AudioEmbed;
  compact?: boolean;
}) {
  const t = tFor("academy_audio");
  const [loaded, setLoaded] = useState(false);
  const ytId = embed.provider === "youtube" ? youtubeId(embed.url) : null;
  const sourceHref = embed.sourceUrl ?? embed.url;

  return (
    <figure
      data-testid="scam-audio-embed"
      className={`overflow-hidden rounded-2xl border border-border bg-card shadow-card ${
        compact ? "mt-3" : "mt-6"
      }`}
    >
      <div className={compact ? "p-3" : "p-4"}>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Volume2 aria-hidden="true" className="h-4 w-4" />
          <span>{t("label")}</span>
        </div>
        <p
          data-testid="scam-audio-embed-title"
          className={`mt-1 font-semibold text-foreground ${compact ? "text-sm" : "text-base"}`}
        >
          {embed.title}
        </p>
        {embed.description && !compact && (
          <p className="mt-1 text-sm text-muted-foreground">{embed.description}</p>
        )}
      </div>

      {ytId && loaded ? (
        <div className="aspect-video w-full bg-black">
          <iframe
            data-testid="scam-audio-embed-iframe"
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`}
            title={embed.title}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      ) : ytId ? (
        <button
          type="button"
          data-testid="scam-audio-embed-play"
          onClick={() => setLoaded(true)}
          aria-label={t("play_aria", { title: embed.title })}
          className="group flex w-full items-center justify-center gap-3 border-t border-border/60 bg-muted/40 px-4 py-6 transition-colors hover:bg-muted/70"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <Play aria-hidden="true" className="h-6 w-6 translate-x-0.5" fill="currentColor" />
          </span>
          <span className="text-sm font-semibold">{t("play")}</span>
        </button>
      ) : (
        <a
          data-testid="scam-audio-embed-open"
          href={sourceHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 border-t border-border/60 bg-muted/40 px-4 py-4 text-sm font-semibold transition-colors hover:bg-muted/70"
        >
          <ExternalLink aria-hidden="true" className="h-4 w-4" />
          {t("open")}
        </a>
      )}

      <figcaption className="flex flex-wrap items-center gap-1 border-t border-border/60 px-4 py-2 text-xs text-muted-foreground">
        <span>{t("source")}:</span>
        <a
          data-testid="scam-audio-embed-source"
          href={sourceHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          {embed.sourceName}
        </a>
      </figcaption>
    </figure>
  );
}
