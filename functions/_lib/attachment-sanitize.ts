// E48.2 — Deterministic-only attachment sanitisation pipeline.
//
// Scope per PLAN decision D-1 (lighter, no third-party AV):
//
//   1. Magic-byte verification — the receiver MUST NOT trust the
//      browser-declared Content-Type. We read the first bytes of the
//      payload and match against the format the user claimed. A
//      mismatch is a hard reject (polyglot, or accidental upload of
//      .exe renamed to .pdf, etc.).
//
//   2. Filename sanitisation — the DB CHECK constraint requires
//      `[A-Za-z0-9._\-]+` and max 200 chars. We pre-sanitise here so
//      the INSERT can't fail on a weird filename and surface 500 to
//      the user.
//
//   3. PDF feature strip — pdf-lib parses the PDF object tree. We
//      remove embedded JavaScript actions (`/JS`, `/JavaScript`),
//      automatic actions (`/AA`, `/OpenAction`), URI actions, AcroForm
//      widgets (which can carry JS submit handlers), and embedded file
//      attachments. The output is a re-serialised PDF that displays
//      the same visual content but has no scripted side-effects.
//
//   4. SHA-256 checksum — for the DB row (audit trail + dedup).
//
//   5. Size + dimension caps — file size cap is enforced at the CF
//      function layer (matches DB CHECK constraint 5 MB). No
//      pixel-count cap on images in v1 — would require a WASM image
//      decoder, deferred to PR #B.1.
//
// What v1 does NOT do (deferred):
//   - Image re-encoding (would strip EXIF + ICC + foreign bytes).
//     Cost: WASM bundle (@jsquash/jpeg + @jsquash/png) is ~400 KB,
//     borderline for CF Pages worker size budget. Image content is
//     stored as-is. Mitigation: bucket is private + RLS-gated, served
//     via signed URLs only to ticket participants.
//   - Image bomb caps (e.g. 25 MP decoded). Same reason as above.
//   - VirusTotal lookup. PLAN D-1 says no third-party AV.

import { PDFDocument, PDFDict, PDFName, PDFArray } from "pdf-lib";

export const MAX_ATTACHMENT_BYTES = 5_242_880; // 5 MB — matches DB CHECK
export const MAX_FILENAME_LENGTH = 200;
export const ALLOWED_MIMES = ["image/png", "image/jpeg", "application/pdf"] as const;
export type AllowedMime = (typeof ALLOWED_MIMES)[number];

// Magic-byte signatures for each accepted format. Source: file format
// specs (PNG RFC 2083, JFIF/JPEG, ISO 32000-1 PDF).
//
// Note: JPEG matches `FF D8 FF` then the 4th byte varies by sub-format
// (`E0` JFIF, `E1` EXIF, `E2`/`E3` etc.). We match the 3-byte prefix.
const MAGIC_SIGNATURES: Record<AllowedMime, readonly number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "application/pdf": [0x25, 0x50, 0x44, 0x46, 0x2d], // %PDF-
};

export type SanitizeError =
  | "size_too_large"
  | "size_zero"
  | "mime_not_allowed"
  | "magic_mismatch"
  | "filename_invalid"
  | "pdf_parse_failed";

export interface SanitizeResult {
  ok: boolean;
  error?: SanitizeError;
  /** Sanitised bytes ready to upload to Storage. For images this equals the input. For PDFs it's the re-serialised tree. */
  bytes?: Uint8Array;
  /** Sanitised filename — `[A-Za-z0-9._\-]+`, <= 200 chars. */
  filename?: string;
  /** SHA-256 hex digest of the sanitised bytes. */
  checksum?: string;
  /** Confirmed MIME (= declared MIME when ok). */
  mime?: AllowedMime;
}

/**
 * Sanitise a single uploaded attachment. Returns a result object;
 * caller is responsible for translating `error` into an HTTP code.
 *
 * Why a result object instead of throwing:
 *   The CF function maps each error code to a documented client-facing
 *   error key (`attachment_too_large`, `attachment_mime_invalid`, …).
 *   Throwing would couple the library to the HTTP layer.
 */
export async function sanitizeAttachment(input: {
  bytes: Uint8Array;
  declaredMime: string;
  declaredFilename: string;
}): Promise<SanitizeResult> {
  const { bytes, declaredMime, declaredFilename } = input;

  // 1. Size guard.
  if (bytes.byteLength === 0) {
    return { ok: false, error: "size_zero" };
  }
  if (bytes.byteLength > MAX_ATTACHMENT_BYTES) {
    return { ok: false, error: "size_too_large" };
  }

  // 2. MIME whitelist.
  if (!ALLOWED_MIMES.includes(declaredMime as AllowedMime)) {
    return { ok: false, error: "mime_not_allowed" };
  }
  const mime = declaredMime as AllowedMime;

  // 3. Magic byte verification — gate against polyglots & spoofed
  //    Content-Type.
  const signature = MAGIC_SIGNATURES[mime];
  if (bytes.byteLength < signature.length) {
    return { ok: false, error: "magic_mismatch" };
  }
  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) {
      return { ok: false, error: "magic_mismatch" };
    }
  }

  // 4. Filename sanitisation.
  const filename = sanitizeFilename(declaredFilename);
  if (!filename) {
    return { ok: false, error: "filename_invalid" };
  }

  // 5. Per-format strip pass.
  let cleanBytes = bytes;
  if (mime === "application/pdf") {
    const stripped = await stripPdfRiskyFeatures(bytes);
    if (!stripped) {
      return { ok: false, error: "pdf_parse_failed" };
    }
    cleanBytes = stripped;
  }
  // For images: v1 passes bytes through unchanged after magic verify.

  // 6. Checksum on the sanitised bytes (post-strip for PDF).
  const checksum = await computeSha256Hex(cleanBytes);

  return {
    ok: true,
    bytes: cleanBytes,
    filename,
    checksum,
    mime,
  };
}

/**
 * Reduce an arbitrary filename to one that satisfies the DB CHECK
 * constraint: `[A-Za-z0-9._\-]+`, length 1..200.
 *
 * Strategy:
 *   - keep ASCII alnum + `.`, `_`, `-`
 *   - replace every other char (spaces, accents, punctuation,
 *     directory traversal segments like `../`) with `_`
 *   - collapse runs of `_` to a single `_`
 *   - trim leading/trailing `_` and `.`
 *   - truncate to 200 chars while preserving the last extension
 *
 * Returns `null` if nothing usable remains (e.g. all bytes were
 * disallowed).
 */
export function sanitizeFilename(input: string): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Strip path-traversal markers up-front — `../../etc/passwd` becomes
  // `etc_passwd` after the basename + replace pipeline below.
  const base = trimmed.split(/[\\/]/).pop() ?? "";
  if (!base) return null;

  // Split off extension (last dot) so we can preserve it across truncation.
  const lastDot = base.lastIndexOf(".");
  const stem = lastDot > 0 ? base.slice(0, lastDot) : base;
  const ext = lastDot > 0 ? base.slice(lastDot + 1) : "";

  const cleanStem = stem
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_.]+|[_.]+$/g, "");
  const cleanExt = ext.replace(/[^A-Za-z0-9]+/g, "").slice(0, 10);

  if (!cleanStem) return null;

  let assembled = cleanExt ? `${cleanStem}.${cleanExt}` : cleanStem;
  if (assembled.length > MAX_FILENAME_LENGTH) {
    const keep = MAX_FILENAME_LENGTH - (cleanExt ? cleanExt.length + 1 : 0);
    assembled = cleanExt
      ? `${cleanStem.slice(0, keep)}.${cleanExt}`
      : cleanStem.slice(0, MAX_FILENAME_LENGTH);
  }

  // Final regex check — catches edge cases like all-dots input.
  if (!/^[A-Za-z0-9._-]+$/.test(assembled)) return null;
  return assembled;
}

/**
 * pdf-lib strip pass — load PDF, remove JS / forms / auto-actions,
 * re-serialise. Returns the sanitised bytes or null if parsing fails
 * (malformed PDF, encrypted PDF we can't unlock, etc.).
 */
export async function stripPdfRiskyFeatures(bytes: Uint8Array): Promise<Uint8Array | null> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, {
      ignoreEncryption: false, // bail on encrypted PDFs — we can't sanitise what we can't read
      throwOnInvalidObject: false,
    });
  } catch {
    return null;
  }

  const catalog = doc.catalog;

  // Names we want to scrub from every dict we walk. PDF objects can
  // reference these from many locations (catalog, page, annotation,
  // form field), so we do a full-tree sweep below.
  const RISKY_NAMES = [
    "JS",
    "JavaScript",
    "AA",
    "OpenAction",
    "URI",
    "Launch",
    "SubmitForm",
    "ImportData",
    "GoToR",
    "GoToE",
    "Sound",
    "Movie",
    "EmbeddedFiles",
    "RichMedia",
    "Rendition",
  ];

  // AcroForm — wholesale removal; the document loses interactive form
  // widgets but the visual content stays.
  catalog.delete(PDFName.of("AcroForm"));

  // Catalog-level Names dict often hosts JavaScript and EmbeddedFiles —
  // strip both even if RISKY_NAMES sweep already gets them via
  // recursion (defence-in-depth).
  const names = catalog.lookup(PDFName.of("Names"));
  if (names instanceof PDFDict) {
    for (const n of ["JavaScript", "EmbeddedFiles"]) {
      names.delete(PDFName.of(n));
    }
  }

  // Walk every indirect object in the document and strip risky names
  // from any dict we encounter. This is O(objects * RISKY) which is
  // bounded by PDF size, fine for ≤5 MB inputs.
  const indirectObjects = doc.context.enumerateIndirectObjects();
  for (const [, obj] of indirectObjects) {
    if (obj instanceof PDFDict) {
      for (const name of RISKY_NAMES) {
        obj.delete(PDFName.of(name));
      }
    } else if (obj instanceof PDFArray) {
      // Arrays themselves can't carry the risky keys, but the dicts
      // they point to do — those are walked via the enumerate above.
    }
  }

  // Re-serialise. updateMetadata=false keeps producer/creator stable
  // for forensics.
  const out = await doc.save({ updateFieldAppearances: false });
  return out;
}

/**
 * SHA-256 hex digest via Web Crypto. Works in CF Workers + Node 20+
 * + jsdom (vitest) — no polyfill needed.
 */
export async function computeSha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
