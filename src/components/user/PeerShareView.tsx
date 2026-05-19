// Phase 7b — offscreen render target for the shareable peer-card PNG.
//
// Sized to 1200x630 (Open Graph standard) at 2x DPR via html-to-image's
// pixelRatio option in the caller. Uses inline styles only — Tailwind
// classes don't round-trip through SVG foreignObject reliably for
// shareable artifacts; the diff-size cost is irrelevant because this
// only renders inside the lazy /app/peer chunk.

import type { PeerCardData } from "@/lib/platform/retention-queries";
import { tFor } from "@/i18n/app-shell";

interface Props {
  data: PeerCardData;
  handle: string | null;
}

export function PeerShareView({ data, handle }: Props) {
  const t = tFor("peer");
  const percentile = data.user_percentile ?? 0;
  const userAttempts = data.user_attempts ?? 0;
  const ranks = (data.branch_ranks ?? []).slice(0, 3);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div
      data-testid="peer-share-view-root"
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 56,
        boxSizing: "border-box",
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        color: "#ffffff",
        background: "linear-gradient(135deg, #1e1b4b 0%, #4338ca 45%, #7c3aed 100%)",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: -0.5,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#ffffff",
              color: "#4338ca",
              fontSize: 22,
              fontWeight: 800,
              textAlign: "center",
              lineHeight: "36px",
            }}
          >
            S
          </span>
          subenai
        </div>
        <div style={{ fontSize: 16, opacity: 0.75 }} data-testid="peer-share-view-eyebrow">
          {t("share.share_title")}
        </div>
      </header>

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          data-testid="peer-share-view-percentile"
          style={{ fontSize: 168, fontWeight: 800, lineHeight: 0.95, letterSpacing: -4 }}
        >
          {percentile}
          <span style={{ fontSize: 72, marginLeft: 6, opacity: 0.85 }}>%</span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 500, opacity: 0.92, maxWidth: 820 }}>
          {t("percentile_body", { p: percentile })}
        </div>
        {handle && (
          <div
            data-testid="peer-share-view-handle"
            style={{ fontSize: 22, opacity: 0.8, marginTop: 4 }}
          >
            — {handle} · {t("share.share_attempts", { n: userAttempts })}
          </div>
        )}
        {!handle && (
          <div style={{ fontSize: 22, opacity: 0.7, marginTop: 4 }}>
            {t("share.share_attempts", { n: userAttempts })}
          </div>
        )}
      </section>

      {ranks.length > 0 && (
        <section data-testid="peer-share-view-ranks" style={{ display: "flex", gap: 16 }}>
          {ranks.map((r) => (
            <div
              key={r.branch_slug}
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.18)",
                borderRadius: 16,
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{ fontSize: 14, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}
              >
                {r.branch_slug}
              </div>
              <div style={{ fontSize: 32, fontWeight: 700 }}>
                {r.user_score}%
                <span style={{ fontSize: 16, fontWeight: 400, opacity: 0.7, marginLeft: 8 }}>
                  / {r.cohort_score ?? "—"}%
                </span>
              </div>
            </div>
          ))}
        </section>
      )}

      <footer
        data-testid="peer-share-view-footer"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 16,
          opacity: 0.78,
          borderTop: "1px solid rgba(255,255,255,0.18)",
          paddingTop: 18,
        }}
      >
        <span>{t("share.share_footer", { date: today })}</span>
        <span style={{ fontWeight: 600 }}>subenai.sk</span>
      </footer>
    </div>
  );
}
