// E53.5 — photo evidence analysis helpers (transport-free, so the Vitest
// suite can exercise the sniff + vision mapping without a Request).
//
// Bytes are NEVER written to KV/R2 on the primary path: the function
// holds them in memory for one vision call and discards them. A KV
// fallback (expirationTtl 1800 + explicit delete after analysis) sits
// behind SCAM_CHAT_PHOTO_KV_FALLBACK and is OFF by default.

import type { AiRunner } from "./run-ai";
import { extractResponseText } from "./gates";
import type { SupportRateLimitKV } from "../security";

export const MAX_PHOTO_BYTES = 5_242_880; // 5 MB — matches attachment-sanitize.
export const PHOTO_LIMIT_PER_WINDOW = 5;
export const PHOTO_WINDOW_SECONDS = 1_800; // 5 / 30 min, plan §Security layer 3.
export const PHOTO_KV_TTL_SECONDS = 1_800; // fallback hard TTL.
// Degradation: past the soft neuron threshold only the first 2 photos of a
// session are analyzed (plan §Cost vision degradation ladder).
export const DEGRADED_PHOTO_CAP = 2;

// JPEG/PNG only for this feature — no PDF uploads (plan §Security layer 4).
// Mirrors MAGIC_SIGNATURES in attachment-sanitize.ts; duplicated here so the
// photo path doesn't pull pdf-lib into its bundle.
type PhotoMime = "image/jpeg" | "image/png";
const PHOTO_SIGNATURES: Record<PhotoMime, readonly number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

export type PhotoSniffError =
  | "size_zero"
  | "size_too_large"
  | "mime_not_allowed"
  | "magic_mismatch";

export interface PhotoSniffResult {
  ok: boolean;
  error?: PhotoSniffError;
  mime?: PhotoMime;
}

// The browser-declared content-type is never trusted: we require the magic
// bytes to match the DECLARED mime, so a PNG payload labeled image/jpeg is
// a hard reject (AC E53.5).
export function sniffPhoto(bytes: Uint8Array, declaredMime: string): PhotoSniffResult {
  if (bytes.byteLength === 0) return { ok: false, error: "size_zero" };
  if (bytes.byteLength > MAX_PHOTO_BYTES) return { ok: false, error: "size_too_large" };
  if (declaredMime !== "image/jpeg" && declaredMime !== "image/png") {
    return { ok: false, error: "mime_not_allowed" };
  }
  const mime = declaredMime as PhotoMime;
  const sig = PHOTO_SIGNATURES[mime];
  if (bytes.byteLength < sig.length) return { ok: false, error: "magic_mismatch" };
  for (let i = 0; i < sig.length; i++) {
    if (bytes[i] !== sig[i]) return { ok: false, error: "magic_mismatch" };
  }
  return { ok: true, mime };
}

const VISION_PROMPT =
  "Si súčasťou asistenta na ochranu pred podvodmi. Opíš po slovensky, čo je na tomto obrázku z hľadiska možného podvodu: typ obsahu (napr. SMS, e-mail, bankový prevod, faktúra), kľúčové texty, odosielateľ/číslo, sumy a podozrivé znaky. Stručne, vecne, bez domýšľania.";

// Reads the vision model's text and trims it to a single findings string.
export function extractFindings(raw: unknown): string {
  return extractResponseText(raw).trim();
}

export async function analyzePhoto(
  runAi: AiRunner,
  model: string,
  bytes: Uint8Array,
): Promise<string> {
  // Workers AI vision binding takes the image as a byte array.
  const raw = await runAi("vision", model, {
    image: Array.from(bytes),
    prompt: VISION_PROMPT,
    max_tokens: 256,
  });
  return extractFindings(raw);
}

// Fallback store (flag-gated, OFF by default). Writes the bytes with a hard
// 30-min TTL and deletes them explicitly the moment analysis finishes — the
// TTL is only a backstop. Returns nothing useful; callers never read it
// back in v1 (the primary path keeps bytes in memory).
export async function storePhotoFallback(
  kv: SupportRateLimitKV | undefined,
  key: string,
  bytes: Uint8Array,
): Promise<void> {
  if (!kv) return;
  // KV string store — base64 keeps it text-safe; a 5 MB photo fits the
  // 25 MB value cap. expirationTtl is the hard backstop.
  await kv.put(key, bytesToBase64(bytes), { expirationTtl: PHOTO_KV_TTL_SECONDS });
}

export async function deletePhotoFallback(
  kv: SupportRateLimitKV | undefined,
  key: string,
): Promise<void> {
  if (!kv) return;
  await kv.delete(key);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
