import type { Visual } from "@/lib/quiz/bank/questions";

// E55.4 — a course `example` section carries a rich `Visual` mockup (the
// realistic phishing SMS/e-mail/listing). To keep lessons in the DB-unified
// `body_mdx` column yet still render those mockups, the converter serialises
// each Visual into a single-line `[[visual:b64:<base64>]]` shortcode. Base64
// over the UTF-8 bytes keeps Slovak diacritics intact and guarantees the
// payload never contains the `]]` terminator. btoa/atob + TextEncoder are
// available in Node, the browser and Cloudflare Workers alike.

export const VISUAL_PREFIX = "[[visual:b64:";

function utf8ToBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToUtf8(b64: string): string {
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeVisual(visual: Visual): string {
  return `${VISUAL_PREFIX}${utf8ToBase64(JSON.stringify(visual))}]]`;
}

// Decode a base64 payload back into a Visual. Returns null on any
// malformed input so a corrupt shortcode degrades to plain text instead
// of crashing the page.
export function decodeVisual(b64: string): Visual | null {
  try {
    const parsed = JSON.parse(base64ToUtf8(b64)) as Visual;
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { kind?: unknown }).kind === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
