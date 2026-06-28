import { describe, it, expect } from "vitest";
import { encodeVisual, decodeVisual, VISUAL_PREFIX } from "@/lib/academy/visual-shortcode";
import type { Visual } from "@/lib/quiz/bank/questions";

const email: Visual = {
  kind: "email",
  from: "Slovenská sporiteľňa",
  fromEmail: "no-reply@slsp-bezpecnost.online",
  subject: "Overte sa do 24 hodín — žiadne diakritiky? ľščťžýáíé",
  body: "Vážený klient, ]] nebezpečný znak v tele.",
  cta: "Overiť účet",
};

describe("visual-shortcode", () => {
  it("round-trips a Visual through encode → decode, preserving diacritics", () => {
    const encoded = encodeVisual(email);
    expect(encoded.startsWith(VISUAL_PREFIX)).toBe(true);
    expect(encoded.endsWith("]]")).toBe(true);
    expect(decodeVisual(encoded.slice(VISUAL_PREFIX.length, -2))).toEqual(email);
  });

  it("never lets the payload contain the ]] terminator", () => {
    const payload = encodeVisual(email).slice(VISUAL_PREFIX.length, -2);
    expect(payload.includes("]]")).toBe(false);
    expect(/^[A-Za-z0-9+/=]+$/.test(payload)).toBe(true);
  });

  it("returns null for malformed base64 or non-Visual JSON", () => {
    expect(decodeVisual("not-base64!!!")).toBeNull();
    expect(decodeVisual(btoa("[1,2,3]"))).toBeNull();
    expect(decodeVisual(btoa('{"no":"kind"}'))).toBeNull();
  });
});
