// E53.5 (client) — per-file pre-check guards before any canvas work.

import { describe, it, expect } from "vitest";

import { precheckPhoto, PHOTO_MAX_BYTES, PHOTO_SESSION_CAP } from "@/lib/scam-chat/photo-client";

function fakeFile(type: string, size: number): File {
  const f = new File([new Uint8Array(1)], "x", { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

describe("precheckPhoto", () => {
  it("accepts a small JPEG and PNG", () => {
    expect(precheckPhoto(fakeFile("image/jpeg", 1000))).toBeNull();
    expect(precheckPhoto(fakeFile("image/png", 1000))).toBeNull();
  });

  it("rejects non-image types", () => {
    expect(precheckPhoto(fakeFile("application/pdf", 1000))).toBe("bad_type");
    expect(precheckPhoto(fakeFile("image/gif", 1000))).toBe("bad_type");
  });

  it("rejects files over 5 MB", () => {
    expect(precheckPhoto(fakeFile("image/jpeg", PHOTO_MAX_BYTES + 1))).toBe("too_large");
  });

  it("caps a session at 5 photos", () => {
    expect(PHOTO_SESSION_CAP).toBe(5);
  });
});
