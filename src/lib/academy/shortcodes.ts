import type { Visual } from "@/lib/quiz/bank/questions";
import { decodeVisual } from "@/lib/academy/visual-shortcode";
import { decodeAudio, type AudioEmbed } from "@/lib/academy/audio-shortcode";

// E55.2 / E55.4 — Academy body shortcodes. The lesson/article body stays plain
// Markdown (DB- and CMS-friendly); a pre-pass splits out inline shortcodes
// onto their own block so the renderer can mount React widgets between
// Markdown runs:
//   [[quiz:<id>]]          interactive w3schools-style question (E55.2)
//   [[visual:b64:<data>]]  realistic scam mockup migrated from a course (E55.4)
//   [[audio:b64:<data>]]   external scam-call recording reference (E61)
// Anything we don't recognise — or a payload that fails to decode — stays
// Markdown text, so a typo never crashes a page.

export type AcademyBlock =
  | { kind: "md"; text: string }
  | { kind: "quiz"; questionId: string }
  | { kind: "visual"; visual: Visual }
  | { kind: "audio"; audio: AudioEmbed };

const QUIZ_LINE = /^\[\[quiz:([a-z0-9_-]+)\]\]\s*$/i;
const VISUAL_LINE = /^\[\[visual:b64:([A-Za-z0-9+/=]+)\]\]\s*$/;
const AUDIO_LINE = /^\[\[audio:b64:([A-Za-z0-9+/=]+)\]\]\s*$/;

export function parseAcademyBody(body: string): AcademyBlock[] {
  const blocks: AcademyBlock[] = [];
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text) blocks.push({ kind: "md", text });
    buffer = [];
  };

  for (const line of body.split("\n")) {
    const quiz = line.match(QUIZ_LINE);
    if (quiz) {
      flush();
      blocks.push({ kind: "quiz", questionId: quiz[1] });
      continue;
    }
    const visual = line.match(VISUAL_LINE);
    if (visual) {
      const decoded = decodeVisual(visual[1]);
      if (decoded) {
        flush();
        blocks.push({ kind: "visual", visual: decoded });
        continue;
      }
    }
    const audio = line.match(AUDIO_LINE);
    if (audio) {
      const decoded = decodeAudio(audio[1]);
      if (decoded) {
        flush();
        blocks.push({ kind: "audio", audio: decoded });
        continue;
      }
    }
    buffer.push(line);
  }
  flush();
  return blocks;
}
