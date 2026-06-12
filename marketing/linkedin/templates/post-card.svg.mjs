// LinkedIn post-card SVG template for subenai.sk.
// Brand: dark navy bg (oklch(0.16 0.03 265) family), acid-lime primary
// (oklch(0.88 0.22 130) ~ #b8ff3d), red-orange accent (~ #e8553f).

const VARIANTS = {
  lime: { accent: "#b8ff3d", glow: "#b8ff3d" },
  orange: { accent: "#e8553f", glow: "#e8553f" },
  sky: { accent: "#7dd3fc", glow: "#7dd3fc" },
};

const BG = "#14141f";
const BG_DEEP = "#0f0f18";
const INK = "#f4f4f8";
const MUTED = "#9b9bb0";
const LIME = "#b8ff3d";
// Arial first: in the sharp/librsvg render pipeline on macOS the
// Inter/Helvetica fontconfig match returns a face with a broken cmap for
// Slovak acute/circumflex glyphs (í é ô ý á render as Cyrillic lookalikes).
// Arial resolves correctly and is metrically close to Inter.
const FONT = "Arial, Inter, -apple-system, 'Segoe UI', sans-serif";

function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrap(text, maxChars) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function renderCard({
  title,
  kicker = "",
  stat = "",
  cta = "",
  variant = "lime",
  wide = false,
}) {
  if (!title) throw new Error("renderCard: title is required");
  const v = VARIANTS[variant] ?? VARIANTS.lime;

  const W = 1200;
  const H = wide ? 627 : 1200;
  const pad = wide ? 72 : 96;

  const kickerSize = wide ? 26 : 34;
  let titleSize = wide ? 64 : 84;
  const maxChars = Math.floor((W - pad * 2) / (titleSize * 0.52));
  let titleLines = wrap(title, maxChars);
  const maxLines = stat ? (wide ? 2 : 3) : wide ? 4 : 6;
  if (titleLines.length > maxLines) {
    titleSize = Math.round(titleSize * 0.8);
    titleLines = wrap(title, Math.floor((W - pad * 2) / (titleSize * 0.52)));
  }
  const lineH = Math.round(titleSize * 1.18);

  const kickerY = wide ? pad + 30 : pad + 44;
  const titleY = kicker ? kickerY + (wide ? 64 : 96) : kickerY;

  const statSize = wide ? 150 : 230;
  // Wide cards anchor the stat bottom-right so it never collides with the
  // CTA pill; square cards flow it below the title.
  const statY = wide
    ? H / 2 + statSize * 0.5
    : titleY + titleLines.length * lineH + 130 + statSize * 0.6;

  const footerY = H - (wide ? 56 : 80);
  const ctaY = footerY - (wide ? 70 : 110);

  const titleSvg = titleLines
    .map(
      (l, i) =>
        `<text x="${pad}" y="${titleY + i * lineH}" font-family="${FONT}" font-size="${titleSize}" font-weight="800" fill="${INK}" letter-spacing="-1.5">${esc(l)}</text>`,
    )
    .join("\n  ");

  const kickerSvg = kicker
    ? `<text x="${pad}" y="${kickerY}" font-family="${FONT}" font-size="${kickerSize}" font-weight="700" fill="${v.accent}" letter-spacing="5" style="text-transform:uppercase">${esc(kicker.toUpperCase())}</text>`
    : "";

  const statSvg = stat
    ? `<text x="${wide ? W - pad : pad}" y="${statY}"${wide ? ' text-anchor="end"' : ""} font-family="${FONT}" font-size="${statSize}" font-weight="900" fill="${v.accent}" letter-spacing="-4">${esc(stat)}</text>`
    : "";

  const ctaSize = wide ? 26 : 32;
  const ctaW = cta ? Math.round(cta.length * ctaSize * 0.6) + 72 : 0;
  const ctaSvg = cta
    ? `<rect x="${pad}" y="${ctaY - ctaSize - 18}" width="${ctaW}" height="${ctaSize + 38}" rx="${(ctaSize + 38) / 2}" fill="none" stroke="${v.accent}" stroke-width="3"/>
  <text x="${pad + 36}" y="${ctaY}" font-family="${FONT}" font-size="${ctaSize}" font-weight="700" fill="${v.accent}">${esc(cta)}</text>`
    : "";

  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${BG}"/>
      <stop offset="1" stop-color="${BG_DEEP}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.1" r="0.8">
      <stop offset="0" stop-color="${v.glow}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${v.glow}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="0" y="0" width="${W}" height="10" fill="${v.accent}"/>
  ${kickerSvg}
  ${titleSvg}
  ${statSvg}
  ${ctaSvg}
  <text x="${pad}" y="${footerY}" font-family="${FONT}" font-size="${wide ? 36 : 46}" font-weight="800" fill="${LIME}" letter-spacing="-1">subenai</text>
  <text x="${W - pad}" y="${footerY}" text-anchor="end" font-family="${FONT}" font-size="${wide ? 26 : 32}" font-weight="600" fill="${MUTED}">subenai.sk</text>
</svg>`;
}
