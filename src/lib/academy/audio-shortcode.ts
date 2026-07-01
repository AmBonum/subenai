// E61 — academy scam-call audio. We host nothing: a lesson references an
// official external recording (NBÚ, Polícia SR, awareness video) which the
// reader can play (YouTube) or open at the source (external link). The
// reference serialises into a single-line `[[audio:b64:<base64>]]` shortcode,
// the same transport the `[[visual:…]]` mockups use, so it survives the
// course → `blog_posts.body_mdx` conversion with Slovak diacritics intact and
// never collides with the `]]` terminator.

export interface AudioEmbed {
  /** youtube → inline privacy player (youtube-nocookie); external → link-out card. */
  provider: "youtube" | "external";
  /** youtube: video id or any watch/share URL; external: URL of the source page. */
  url: string;
  title: string;
  /** Attribution — who recorded/published it (e.g. "NBÚ", "Polícia SR"). */
  sourceName: string;
  /** Canonical source page; falls back to `url` when omitted. */
  sourceUrl?: string;
  description?: string;
}

export const AUDIO_PREFIX = "[[audio:b64:";

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

export function encodeAudio(audio: AudioEmbed): string {
  return `${AUDIO_PREFIX}${utf8ToBase64(JSON.stringify(audio))}]]`;
}

// Returns null on any malformed input so a corrupt shortcode degrades to
// plain text instead of crashing the lesson page.
export function decodeAudio(b64: string): AudioEmbed | null {
  try {
    const parsed = JSON.parse(base64ToUtf8(b64)) as AudioEmbed;
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed.provider === "youtube" || parsed.provider === "external") &&
      typeof parsed.url === "string" &&
      typeof parsed.title === "string" &&
      typeof parsed.sourceName === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract the 11-char YouTube video id from a watch / share / embed URL, or
 * return the input unchanged when it already looks like a bare id. Returns
 * null when nothing id-like is present.
 */
export function youtubeId(urlOrId: string): string | null {
  if (/^[A-Za-z0-9_-]{11}$/.test(urlOrId)) return urlOrId;
  const m = urlOrId.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return m ? m[1] : null;
}
