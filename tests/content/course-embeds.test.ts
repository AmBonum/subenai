import { describe, it, expect } from "vitest";
import { COURSES } from "@/content/courses";
import { youtubeId } from "@/lib/academy/audio-shortcode";

// E63 — scam-awareness video embeds added across the academy. This guards
// every course `embed` section so a typo'd URL or a missing attribution can
// never ship a broken player.

const embeds = COURSES.flatMap((c) =>
  c.sections
    .filter((s): s is Extract<typeof s, { kind: "embed" }> => s.kind === "embed")
    .map((s) => ({ slug: c.slug, heading: s.heading, audio: s.audio })),
);

describe("course scam-awareness video embeds (E63)", () => {
  it("multiple courses carry a video embed", () => {
    expect(embeds.length).toBeGreaterThanOrEqual(7);
  });

  it("every embed has a title and a source attribution", () => {
    for (const e of embeds) {
      expect(e.audio.title.trim().length).toBeGreaterThan(0);
      expect(e.audio.sourceName.trim().length).toBeGreaterThan(0);
    }
  });

  it("every embed url is a valid URL", () => {
    for (const e of embeds) {
      expect(() => new URL(e.audio.url)).not.toThrow();
    }
  });

  it("every YouTube embed exposes an extractable 11-char video id", () => {
    for (const e of embeds.filter((e) => e.audio.provider === "youtube")) {
      expect(youtubeId(e.audio.url), `${e.slug}: ${e.audio.url}`).toMatch(/^[A-Za-z0-9_-]{11}$/);
    }
  });
});
