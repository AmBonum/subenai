// E53.5 — photo evidence endpoint. One downscaled image per call.
//
// POST /api/scam-chat/photo   (multipart/form-data)
//   file:  the downscaled JPEG/PNG (≤ 5 MB, client downscales to ≤1600px)
//   index: 0-based photo position in the session (for the degradation cap)
//
// Pipeline:
//   1. Per-IP photo limit 5 / 30 min (KV-backed; security.ts)
//   2. Neuron ledger — hard stop → 429 fail-closed; soft → degrade so only
//      the first DEGRADED_PHOTO_CAP photos are analyzed, the rest get a
//      Slovak "skipped" notice (AC E53.5 degradation).
//   3. Magic-byte sniff (JPEG/PNG only) — declared content-type is never
//      trusted; 413 oversized, 422 spoofed/unsupported.
//   4. In-request vision call → findings JSON returned → bytes discarded.
//      No KV/R2 write on the primary path. Fallback store is flag-gated
//      (SCAM_CHAT_PHOTO_KV_FALLBACK) and deletes after analysis.

import {
  createNeuronLedger,
  FAIL_CLOSED_MESSAGE,
  resolveThresholds,
} from "../../_lib/scam-chat/budget";
import {
  analyzePhoto,
  deletePhotoFallback,
  DEGRADED_PHOTO_CAP,
  PHOTO_LIMIT_PER_WINDOW,
  PHOTO_WINDOW_SECONDS,
  sniffPhoto,
  storePhotoFallback,
} from "../../_lib/scam-chat/photo";
import { createAiRunner, type AiBinding } from "../../_lib/scam-chat/run-ai";
import { consumeRateLimit, readClientIp, type SupportRateLimitKV } from "../../_lib/security";

export interface Env {
  AI?: AiBinding;
  SCAM_CHAT_KV?: SupportRateLimitKV;
  SUPPORT_RATE_LIMIT_KV?: SupportRateLimitKV;
  SCAM_CHAT_NEURON_SOFT?: string;
  SCAM_CHAT_NEURON_HARD?: string;
  SCAM_CHAT_VISION_MODEL?: string;
  // OFF by default. "1"/"true" enables the KV fallback store path.
  SCAM_CHAT_PHOTO_KV_FALLBACK?: string;
}

interface RequestContext {
  request: Request;
  env: Env;
}

const DEFAULT_VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

// Slovak notice when the budget forced this photo to be skipped.
export const PHOTO_DEGRADED_NOTICE =
  "Kvôli dennému limitu sme analyzovali iba prvé 2 fotky. Ďalšie fotky pridajte zajtra.";

interface BlobLike {
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
}
function isBlobLike(value: unknown): value is BlobLike {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function" &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function onRequestPost(ctx: RequestContext): Promise<Response> {
  const { request, env } = ctx;

  if (!env.AI) {
    return jsonResponse(500, {
      error: "not_configured",
      message: "Asistent nie je správne nakonfigurovaný.",
    });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse(422, { error: "invalid_request", message: "Neplatná požiadavka." });
  }

  // Accept any Blob-like field (File extends Blob). `instanceof File` is
  // unreliable across the Workers / undici / jsdom runtimes; duck-typing on
  // arrayBuffer + type is the portable check.
  const file = form.get("file");
  if (!isBlobLike(file)) {
    return jsonResponse(422, { error: "invalid_request", message: "Chýba súbor." });
  }
  const index = Number.parseInt(String(form.get("index") ?? "0"), 10);
  const photoIndex = Number.isFinite(index) && index >= 0 ? index : 0;

  const ip = readClientIp(request);
  const kv = env.SCAM_CHAT_KV ?? env.SUPPORT_RATE_LIMIT_KV;

  if (!(await consumeRateLimit(kv, "sc-photo", ip, PHOTO_LIMIT_PER_WINDOW, PHOTO_WINDOW_SECONDS))) {
    return jsonResponse(429, {
      error: "rate_limited",
      message: "Limit fotiek bol vyčerpaný. Skúste to, prosím, o pol hodiny.",
    });
  }

  const ledger = createNeuronLedger(kv, resolveThresholds(env));
  const budgetStatus = await ledger.status();
  if (budgetStatus === "hard") {
    return jsonResponse(429, { error: "quota_exhausted", message: FAIL_CLOSED_MESSAGE });
  }
  // Degradation: past the soft threshold, only the first 2 photos run vision.
  if (budgetStatus === "soft" && photoIndex >= DEGRADED_PHOTO_CAP) {
    return jsonResponse(200, {
      ok: true,
      analyzed: false,
      degraded: true,
      findings: null,
      notice: PHOTO_DEGRADED_NOTICE,
    });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniff = sniffPhoto(bytes, file.type);
  if (!sniff.ok) {
    if (sniff.error === "size_too_large") {
      return jsonResponse(413, { error: "size_too_large", message: "Fotka presahuje 5 MB." });
    }
    return jsonResponse(422, {
      error: sniff.error ?? "magic_mismatch",
      message: "Súbor nie je platná JPEG ani PNG fotka.",
    });
  }

  const fallbackEnabled =
    env.SCAM_CHAT_PHOTO_KV_FALLBACK === "1" || env.SCAM_CHAT_PHOTO_KV_FALLBACK === "true";
  const fallbackKey = `sc:photo:${ip}:${photoIndex}:${Date.now()}`;
  if (fallbackEnabled) await storePhotoFallback(kv, fallbackKey, bytes);

  const runAi = createAiRunner(env.AI, ledger);
  const visionModel = env.SCAM_CHAT_VISION_MODEL ?? DEFAULT_VISION_MODEL;
  let findings: string;
  try {
    findings = await analyzePhoto(runAi, visionModel, bytes);
  } catch {
    if (fallbackEnabled) await deletePhotoFallback(kv, fallbackKey);
    return jsonResponse(200, {
      ok: true,
      analyzed: false,
      degraded: budgetStatus === "soft",
      findings: null,
      notice: "Fotku sa nepodarilo analyzovať. Skúste inú alebo pokračujte textom.",
    });
  } finally {
    // Bytes are discarded with the request scope; the explicit delete fires
    // immediately after analysis so the fallback TTL is only a backstop.
    if (fallbackEnabled) await deletePhotoFallback(kv, fallbackKey);
  }

  return jsonResponse(200, {
    ok: true,
    analyzed: true,
    degraded: budgetStatus === "soft",
    findings,
    notice: null,
  });
}
