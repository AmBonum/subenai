/**
 * IG Story (1080×1920) image generator.
 * Pure browser canvas — no server, no deps.
 */

interface DrawArgs {
  score: number;
  percentile: number;
  personalityEmoji: string;
  personalityName: string;
  tagline: string;
  breakdown: Record<"phishing" | "url" | "fake_vs_real" | "scenario", number>;
  url: string;
}

const W = 1080;
const H = 1920;

const CATEGORY_LABEL: Record<keyof DrawArgs["breakdown"], string> = {
  phishing: "Phishing",
  url: "URL & domény",
  fake_vs_real: "Fake stránky",
  scenario: "Scenáre",
};

export async function drawIgStoryToCanvas(args: DrawArgs): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  // ===== Background gradient =====
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0b1020");
  bg.addColorStop(0.5, "#1a0f3d");
  bg.addColorStop(1, "#0b1020");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle radial glow at top
  const glow = ctx.createRadialGradient(W / 2, 320, 50, W / 2, 320, 700);
  glow.addColorStop(0, "rgba(139, 92, 246, 0.35)");
  glow.addColorStop(1, "rgba(139, 92, 246, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // ===== Brand header =====
  const labelFont = "800 60px system-ui, -apple-system, Segoe UI, Roboto";
  const blockY = 148;

  // "subenai" in brand lime-green
  ctx.fillStyle = "#c8f02b";
  ctx.font = labelFont;
  ctx.textAlign = "center";
  ctx.fillText("subenai", W / 2, blockY + 44);

  // ===== Score =====
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "500 36px system-ui";
  ctx.fillText("Môj výsledok", W / 2, 320);

  // Big score
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 360px system-ui";
  ctx.fillText(String(args.score), W / 2, 700);

  // /100
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "700 64px system-ui";
  ctx.fillText("/ 100", W / 2, 780);

  // Percentile pill
  const pillText = `Lepšie než ${args.percentile} % ľudí`;
  ctx.font = "700 36px system-ui";
  const pillW = ctx.measureText(pillText).width + 80;
  const pillX = (W - pillW) / 2;
  const pillY = 830;
  roundedRect(ctx, pillX, pillY, pillW, 80, 40);
  ctx.fillStyle = "rgba(139, 92, 246, 0.25)";
  ctx.fill();
  ctx.strokeStyle = "rgba(167, 139, 250, 0.7)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#e9d5ff";
  ctx.fillText(pillText, W / 2, pillY + 53);

  // ===== Personality card =====
  const cardY = 980;
  const cardH = 360;
  roundedRect(ctx, 80, cardY, W - 160, cardH, 32);
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Emoji
  ctx.font = "120px system-ui, 'Apple Color Emoji', 'Segoe UI Emoji'";
  ctx.fillText(args.personalityEmoji, W / 2, cardY + 140);

  // Personality name
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 64px system-ui";
  ctx.fillText(args.personalityName, W / 2, cardY + 230);

  // Tagline
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "italic 500 36px system-ui";
  wrapText(ctx, `„${args.tagline}"`, W / 2, cardY + 290, W - 240, 44);

  // ===== Breakdown bars =====
  const breakdownY = 1410;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "600 32px system-ui";
  ctx.textAlign = "left";
  ctx.fillText("ROZLOŽENIE", 100, breakdownY);

  const cats = Object.keys(args.breakdown) as Array<keyof DrawArgs["breakdown"]>;
  const barW = W - 200;
  cats.forEach((c, i) => {
    const y = breakdownY + 50 + i * 80;
    // label
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 30px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(CATEGORY_LABEL[c], 100, y);
    // value
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "700 30px system-ui";
    ctx.fillText(`${args.breakdown[c]}%`, W - 100, y);
    // bar bg
    roundedRect(ctx, 100, y + 14, barW, 14, 7);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fill();
    // bar fill
    const pct = Math.max(0, Math.min(100, args.breakdown[c])) / 100;
    const fillW = Math.max(14, barW * pct);
    roundedRect(ctx, 100, y + 14, fillW, 14, 7);
    ctx.fillStyle =
      args.breakdown[c] >= 70 ? "#22c55e" : args.breakdown[c] >= 40 ? "#f59e0b" : "#ef4444";
    ctx.fill();
  });

  // ===== Footer / CTA =====
  ctx.textAlign = "center";

  // Big "Skús aj ty:" — much more visible
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 56px system-ui";
  ctx.fillText("Skús aj ty:", W / 2, H - 220);

  // Short URL — domain only (no /r/XXXX path)
  const shortDomain = stripProtocol(args.url).split("/")[0];

  // URL pill — bigger, bolder
  ctx.font = "800 48px system-ui";
  const urlW = Math.min(W - 120, ctx.measureText(shortDomain).width + 100);
  const urlX = (W - urlW) / 2;
  roundedRect(ctx, urlX, H - 170, urlW, 96, 48);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.fillStyle = "#0b1020";
  ctx.fillText(shortDomain, W / 2, H - 105);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      "image/png",
      0.95,
    );
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let curY = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, curY);
      line = w;
      curY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, curY);
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, "");
}
