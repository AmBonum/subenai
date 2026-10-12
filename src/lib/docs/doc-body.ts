// E66.5 — docs body shortcodes. A doc body stays plain Markdown; a line that
// is exactly `[[scene3d:<name>]]` or `[[scene3d:<name>|<caption>]]` is split
// out so the renderer can mount a CSS 3D illustration between Markdown runs
// (same line-shortcode transport as the academy `[[audio:…]]` embeds).
// Unknown names stay Markdown text so a typo never crashes a page; the docs
// content test asserts every shortcode in the registry resolves.

export const SCENE3D_NAMES = [
  "scam-phone",
  "evidence-report",
  "campaign-flow",
  "shield-stack",
] as const;

export type Scene3DName = (typeof SCENE3D_NAMES)[number];

export type DocBlock =
  | { kind: "md"; text: string }
  | { kind: "scene3d"; name: Scene3DName; caption?: string };

export const SCENE3D_LINE = /^\[\[scene3d:([a-z0-9-]+)(?:\|([^\]]+))?\]\]$/;

export function isScene3DName(value: string): value is Scene3DName {
  return (SCENE3D_NAMES as readonly string[]).includes(value);
}

export function parseDocBody(body: string): DocBlock[] {
  const blocks: DocBlock[] = [];
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text) blocks.push({ kind: "md", text });
    buffer = [];
  };

  for (const line of body.split("\n")) {
    const match = line.trim().match(SCENE3D_LINE);
    if (match && isScene3DName(match[1])) {
      flush();
      const caption = match[2]?.trim();
      blocks.push({ kind: "scene3d", name: match[1], ...(caption ? { caption } : {}) });
      continue;
    }
    buffer.push(line);
  }
  flush();
  return blocks;
}
