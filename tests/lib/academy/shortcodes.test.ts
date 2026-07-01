import { describe, it, expect } from "vitest";
import { parseAcademyBody } from "@/lib/academy/shortcodes";
import { encodeVisual } from "@/lib/academy/visual-shortcode";
import { encodeAudio, type AudioEmbed } from "@/lib/academy/audio-shortcode";
import type { Visual } from "@/lib/quiz/bank/questions";

describe("parseAcademyBody", () => {
  it("splits prose and a quiz shortcode into ordered blocks", () => {
    const blocks = parseAcademyBody("Úvod.\n\n[[quiz:p-sms-posta-1]]\n\nZáver.");
    expect(blocks).toEqual([
      { kind: "md", text: "Úvod." },
      { kind: "quiz", questionId: "p-sms-posta-1" },
      { kind: "md", text: "Záver." },
    ]);
  });

  it("returns a single md block when there are no shortcodes", () => {
    const blocks = parseAcademyBody("Len text.\nDruhý riadok.");
    expect(blocks).toEqual([{ kind: "md", text: "Len text.\nDruhý riadok." }]);
  });

  it("supports back-to-back quizzes", () => {
    const blocks = parseAcademyBody("[[quiz:a1]]\n[[quiz:b2]]");
    expect(blocks).toEqual([
      { kind: "quiz", questionId: "a1" },
      { kind: "quiz", questionId: "b2" },
    ]);
  });

  it("leaves an unrecognised shortcode as Markdown text (no crash)", () => {
    const blocks = parseAcademyBody("[[unknown:x]]");
    expect(blocks).toEqual([{ kind: "md", text: "[[unknown:x]]" }]);
  });

  it("decodes a [[visual:…]] shortcode into a visual block between prose", () => {
    const visual: Visual = { kind: "sms", sender: "DPD", body: "Balík čaká", link: "http://x.io" };
    const blocks = parseAcademyBody(`Pred.\n\n${encodeVisual(visual)}\n\nPo.`);
    expect(blocks).toEqual([
      { kind: "md", text: "Pred." },
      { kind: "visual", visual },
      { kind: "md", text: "Po." },
    ]);
  });

  it("leaves a corrupt visual payload as Markdown text (no crash)", () => {
    const blocks = parseAcademyBody("[[visual:b64:!!!notbase64!!!]]");
    expect(blocks).toEqual([{ kind: "md", text: "[[visual:b64:!!!notbase64!!!]]" }]);
  });

  it("decodes an [[audio:…]] shortcode into an audio block between prose", () => {
    const audio: AudioEmbed = {
      provider: "youtube",
      url: "https://www.youtube.com/watch?v=SbZz2Q2t-aU",
      title: "Podvod na telefóne",
      sourceName: "Tatra banka",
    };
    const blocks = parseAcademyBody(`Pred.\n\n${encodeAudio(audio)}\n\nPo.`);
    expect(blocks).toEqual([
      { kind: "md", text: "Pred." },
      { kind: "audio", audio },
      { kind: "md", text: "Po." },
    ]);
  });

  it("leaves a corrupt audio payload as Markdown text (no crash)", () => {
    const blocks = parseAcademyBody("[[audio:b64:!!!notbase64!!!]]");
    expect(blocks).toEqual([{ kind: "md", text: "[[audio:b64:!!!notbase64!!!]]" }]);
  });
});
