/**
 * @vitest-environment node
 *
 * jsdom's FormData/Blob round-trip drops the file's content-type and
 * mangles bytes (same reason support-attachment-upload.test.ts overrides
 * the env). The photo endpoint parses real multipart, so it runs in node.
 */
// E53.5 — photo endpoint: magic-byte sniff, size cap, per-IP limit,
// vision findings shape, KV-spy zero-write on the primary path, fallback
// TTL + explicit delete, degradation past the soft threshold.

import { describe, it, expect, beforeEach } from "vitest";

import { onRequestPost, PHOTO_DEGRADED_NOTICE } from "../../functions/api/scam-chat/photo";
import { sniffPhoto, MAX_PHOTO_BYTES } from "../../functions/_lib/scam-chat/photo";
import { DEFAULT_SOFT_NEURONS } from "../../functions/_lib/scam-chat/budget";
import { __test__ as security__test__ } from "../../functions/_lib/security";
import { makeKv, type MockKv, type MockAi } from "./scam-chat-helpers";

beforeEach(() => security__test__.resetAll());

const JPEG_MAGIC = [0xff, 0xd8, 0xff, 0xe0];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function bytes(magic: number[], len = 64): Uint8Array {
  const u = new Uint8Array(len);
  u.set(magic);
  return u;
}

function makeVisionAi(findings = "SMS od falošnej banky s odkazom."): MockAi {
  const calls: { model: string; inputs: Record<string, unknown> }[] = [];
  return {
    calls,
    async run(model, inputs) {
      calls.push({ model, inputs });
      return { response: findings };
    },
  };
}

function photoRequest(opts: {
  data: Uint8Array;
  mime: string;
  index?: number;
  ip?: string;
}): Request {
  const form = new FormData();
  form.append(
    "file",
    new File([opts.data.buffer as ArrayBuffer], "evidence.jpg", { type: opts.mime }),
  );
  form.append("index", String(opts.index ?? 0));
  return new Request("https://subenai.sk/api/scam-chat/photo", {
    method: "POST",
    headers: { "cf-connecting-ip": opts.ip ?? "203.0.113.9" },
    body: form,
  });
}

interface PhotoEnv {
  AI: MockAi;
  SCAM_CHAT_KV: MockKv;
  SCAM_CHAT_PHOTO_KV_FALLBACK?: string;
}
function photoEnv(over: Partial<PhotoEnv> = {}): PhotoEnv {
  return { AI: makeVisionAi(), SCAM_CHAT_KV: makeKv(), ...over };
}

describe("sniffPhoto", () => {
  it("accepts a JPEG declared image/jpeg", () => {
    expect(sniffPhoto(bytes(JPEG_MAGIC), "image/jpeg")).toEqual({ ok: true, mime: "image/jpeg" });
  });

  it("accepts a PNG declared image/png", () => {
    expect(sniffPhoto(bytes(PNG_MAGIC), "image/png")).toEqual({ ok: true, mime: "image/png" });
  });

  it("rejects PNG bytes labeled image/jpeg (magic mismatch)", () => {
    expect(sniffPhoto(bytes(PNG_MAGIC), "image/jpeg")).toEqual({
      ok: false,
      error: "magic_mismatch",
    });
  });

  it("rejects an unsupported declared mime (PDF)", () => {
    expect(sniffPhoto(bytes([0x25, 0x50, 0x44, 0x46]), "application/pdf").error).toBe(
      "mime_not_allowed",
    );
  });

  it("rejects empty and oversized payloads", () => {
    expect(sniffPhoto(new Uint8Array(0), "image/jpeg").error).toBe("size_zero");
    expect(sniffPhoto(bytes(JPEG_MAGIC, MAX_PHOTO_BYTES + 1), "image/jpeg").error).toBe(
      "size_too_large",
    );
  });
});

describe("photo endpoint", () => {
  it("analyzes a valid JPEG and returns findings; bytes never written to KV", async () => {
    const env = photoEnv();
    const res = await onRequestPost({
      request: photoRequest({ data: bytes(JPEG_MAGIC), mime: "image/jpeg" }),
      env,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { analyzed: boolean; findings: string };
    expect(body.analyzed).toBe(true);
    expect(body.findings).toContain("banky");
    // KV-spy: only ledger/rate-limit counters, never a photo byte blob.
    for (const put of env.SCAM_CHAT_KV.puts) {
      expect(put.key.startsWith("sc:photo:")).toBe(false);
    }
    // The vision call carried the image bytes, not a stored reference.
    expect(env.AI.calls[0].inputs).toHaveProperty("image");
  });

  it("rejects PNG-bytes-as-jpeg with 422", async () => {
    const res = await onRequestPost({
      request: photoRequest({ data: bytes(PNG_MAGIC), mime: "image/jpeg" }),
      env: photoEnv(),
    });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: string }).error).toBe("magic_mismatch");
  });

  it("rejects an oversized photo with 413", async () => {
    const res = await onRequestPost({
      request: photoRequest({ data: bytes(JPEG_MAGIC, MAX_PHOTO_BYTES + 1), mime: "image/jpeg" }),
      env: photoEnv(),
    });
    expect(res.status).toBe(413);
  });

  it("rejects a spoofed-extension PDF (declared image/jpeg, %PDF bytes) with 422", async () => {
    const res = await onRequestPost({
      request: photoRequest({ data: bytes([0x25, 0x50, 0x44, 0x46]), mime: "image/jpeg" }),
      env: photoEnv(),
    });
    expect(res.status).toBe(422);
  });

  it("rejects the 6th photo from one IP (per-IP 5/30min limit) with 429", async () => {
    const env = photoEnv();
    for (let i = 0; i < 5; i++) {
      const ok = await onRequestPost({
        request: photoRequest({
          data: bytes(JPEG_MAGIC),
          mime: "image/jpeg",
          ip: "9.9.9.9",
          index: i,
        }),
        env,
      });
      expect(ok.status).toBe(200);
    }
    const sixth = await onRequestPost({
      request: photoRequest({
        data: bytes(JPEG_MAGIC),
        mime: "image/jpeg",
        ip: "9.9.9.9",
        index: 5,
      }),
      env,
    });
    expect(sixth.status).toBe(429);
  });

  it("degrades past the soft threshold: 3rd photo skipped with a Slovak notice", async () => {
    const kv = makeKv({
      [`sc:neurons:${new Date().toISOString().slice(0, 10)}`]: String(DEFAULT_SOFT_NEURONS),
    });
    const env = photoEnv({ SCAM_CHAT_KV: kv });
    const res = await onRequestPost({
      request: photoRequest({ data: bytes(JPEG_MAGIC), mime: "image/jpeg", index: 2 }),
      env,
    });
    const body = (await res.json()) as { analyzed: boolean; degraded: boolean; notice: string };
    expect(body.analyzed).toBe(false);
    expect(body.degraded).toBe(true);
    expect(body.notice).toBe(PHOTO_DEGRADED_NOTICE);
    // No vision call happened for the skipped photo.
    expect(env.AI.calls).toHaveLength(0);
  });
});

describe("photo KV fallback (flag on)", () => {
  it("writes with expirationTtl 1800 and deletes after analysis", async () => {
    const env = photoEnv({ SCAM_CHAT_PHOTO_KV_FALLBACK: "1" });
    const res = await onRequestPost({
      request: photoRequest({ data: bytes(JPEG_MAGIC), mime: "image/jpeg" }),
      env,
    });
    expect(res.status).toBe(200);
    const photoPut = env.SCAM_CHAT_KV.puts.find((p) => p.key.startsWith("sc:photo:"));
    expect(photoPut?.ttl).toBe(1800);
    // Explicit delete fired — the bytes are gone, TTL is only a backstop.
    const photoKey = photoPut!.key;
    expect(env.SCAM_CHAT_KV.store.has(photoKey)).toBe(false);
  });
});
