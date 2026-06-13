// E53.5 (client) — canvas downscale to ≤1600px JPEG + per-file 5 MB
// pre-check. Originals NEVER leave the device; only the downscaled copy
// is uploaded for analysis, and a thumbnail data URL is kept in React
// state for the chat + the local PDF.

export const PHOTO_MAX_DIMENSION = 1600;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_SESSION_CAP = 5;
export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png"] as const;

export type PhotoPrecheckError = "too_large" | "bad_type";

export function precheckPhoto(file: File): PhotoPrecheckError | null {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type as (typeof ACCEPTED_PHOTO_TYPES)[number])) {
    return "bad_type";
  }
  if (file.size > PHOTO_MAX_BYTES) return "too_large";
  return null;
}

export interface DownscaledPhoto {
  /** Downscaled JPEG blob — the ONLY thing uploaded (for vision analysis). */
  blob: Blob;
  /** Downscaled data: URL — the chat thumbnail. */
  dataUrl: string;
  /**
   * Full-resolution data: URL of the ORIGINAL file, kept locally for the
   * police-report PDF only. Never uploaded — a police filing wants the
   * evidence at original quality, while analysis only needs the ≤1600px copy.
   */
  originalDataUrl: string;
}

// Downscales the longest edge to ≤ PHOTO_MAX_DIMENSION and re-encodes as
// JPEG. Screenshots (the dominant evidence type) stay legible. Runs fully
// client-side via a canvas; no bytes leave until the explicit upload.
export async function downscalePhoto(file: File): Promise<DownscaledPhoto> {
  const originalDataUrl = await readFileAsDataUrl(file);
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, PHOTO_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ("close" in bitmap && typeof bitmap.close === "function") bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode_failed"))), "image/jpeg", 0.82);
  });
  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
  return { blob, dataUrl, originalDataUrl };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  // jsdom / older browsers fallback.
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image_load_failed"));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
