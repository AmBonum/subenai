// E54 — public documentation content model. Docs are authored as TS
// modules (the in-repo content pattern, same as src/content/courses/*),
// not glob-loaded MDX — deterministic in the Cloudflare SSR build. The
// `body` is Markdown, rendered with the shared BlogPostBody renderer.

export interface PublicDoc {
  /** URL slug: /docs/<slug>. Must not collide with the reserved "app"/"admin" subtrees. */
  slug: string;
  title: string;
  /** Meta description + index card summary (1 sentence). */
  description: string;
  /** Sort order within the index. */
  order: number;
  /** Grouping label shown in the index + sidebar. */
  category: string;
  /** Markdown body. */
  body: string;
}
