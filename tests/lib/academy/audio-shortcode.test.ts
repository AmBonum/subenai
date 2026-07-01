import { describe, it, expect } from "vitest";
import {
  encodeAudio,
  decodeAudio,
  youtubeId,
  AUDIO_PREFIX,
  type AudioEmbed,
} from "@/lib/academy/audio-shortcode";

describe("audio-shortcode (E61)", () => {
  const embed: AudioEmbed = {
    provider: "youtube",
    url: "https://www.youtube.com/watch?v=SbZz2Q2t-aU",
    title: "Podvod na telefóne — ukážka",
    sourceName: "Tatra banka",
    sourceUrl: "https://www.youtube.com/watch?v=SbZz2Q2t-aU",
    description: "Osvetové video s diakritikou: ľščťžý.",
  };

  it("round-trips through encode/decode preserving Slovak diacritics", () => {
    const encoded = encodeAudio(embed);
    expect(encoded.startsWith(AUDIO_PREFIX)).toBe(true);
    expect(encoded.endsWith("]]")).toBe(true);
    expect(decodeAudio(encoded.slice(AUDIO_PREFIX.length, -2))).toEqual(embed);
  });

  it("never emits the ]] terminator inside the payload", () => {
    const payload = encodeAudio(embed).slice(AUDIO_PREFIX.length, -2);
    expect(payload.includes("]]")).toBe(false);
  });

  it("returns null for malformed base64 or JSON", () => {
    expect(decodeAudio("!!!notbase64!!!")).toBeNull();
    expect(decodeAudio(btoa("not json"))).toBeNull();
  });

  it("returns null when required fields are missing or provider is invalid", () => {
    expect(decodeAudio(btoa(JSON.stringify({ provider: "youtube" })))).toBeNull();
    expect(
      decodeAudio(
        btoa(JSON.stringify({ provider: "vimeo", url: "x", title: "t", sourceName: "s" })),
      ),
    ).toBeNull();
  });

  it("extracts a YouTube id from watch, share, embed URLs and bare ids", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=SbZz2Q2t-aU")).toBe("SbZz2Q2t-aU");
    expect(youtubeId("https://youtu.be/SbZz2Q2t-aU")).toBe("SbZz2Q2t-aU");
    expect(youtubeId("https://www.youtube.com/embed/SbZz2Q2t-aU")).toBe("SbZz2Q2t-aU");
    expect(youtubeId("SbZz2Q2t-aU")).toBe("SbZz2Q2t-aU");
    expect(youtubeId("https://example.com/not-a-video")).toBeNull();
  });
});
