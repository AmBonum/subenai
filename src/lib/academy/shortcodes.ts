// E55.2 — Academy body shortcodes. The lesson/article body stays plain
// Markdown (DB- and CMS-friendly); a pre-pass splits out inline shortcodes
// onto their own block so the renderer can mount React widgets between
// Markdown runs. Today: [[quiz:<id>]] (interactive w3schools-style question).
// E55.4 extends this with [[visual:…]]. Anything we don't recognise stays
// Markdown text — a typo never crashes a page.

export type AcademyBlock = { kind: "md"; text: string } | { kind: "quiz"; questionId: string };

const QUIZ_LINE = /^\[\[quiz:([a-z0-9_-]+)\]\]\s*$/i;

export function parseAcademyBody(body: string): AcademyBlock[] {
  const blocks: AcademyBlock[] = [];
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text) blocks.push({ kind: "md", text });
    buffer = [];
  };

  for (const line of body.split("\n")) {
    const match = line.match(QUIZ_LINE);
    if (match) {
      flush();
      blocks.push({ kind: "quiz", questionId: match[1] });
    } else {
      buffer.push(line);
    }
  }
  flush();
  return blocks;
}
