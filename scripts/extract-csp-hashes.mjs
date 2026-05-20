#!/usr/bin/env node
// E39 Phase B — post-build CSP narrowing.
//
// Walks every HTML emitted to `dist/client/`, extracts each inline
// `<script>` block (no `src=`), computes SHA-256, and rewrites
// `dist/client/_headers` so `script-src` lists the hashes instead of
// `'unsafe-inline'`.
//
// Why this exists: TanStack Start's static build emits a small set of
// known inline bootstraps (GA consent default + GA loader + JSON-LD
// blocks). Those are stable PER BUILD — they change only when the
// source HTML or JSON-LD does — so hash-based CSP is a precise fit.
// Dynamic per-request scripts would need a runtime nonce middleware
// (see `specs/security/csp-phase-b-narrowing.md`); we don't have any.
//
// Dev mode (`vite dev`) is unaffected — Vite doesn't serve `_headers`
// and CSP isn't enforced locally. The narrowing only ships in the
// production artifact.
//
// Module + CLI: import the named exports in tests; running the file
// directly executes the CLI block at the bottom.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { JSDOM } from "jsdom";

/**
 * Pull every inline `<script>...</script>` body out of HTML.
 * Skips `<script src="…"></script>` (external) and `<script type="module" src=…>`.
 * Keeps JSON-LD blocks (`<script type="application/ld+json">`) because
 * the browser still applies CSP to them.
 *
 * Uses jsdom (a real WHATWG HTML parser) rather than a regex — a regex
 * can't safely match HTML edge cases like `</script >` (trailing
 * whitespace) or `<script>...<script>...</script>...</script>` (CodeQL
 * `js/bad-tag-filter`). jsdom is already a devDep used by Vitest's
 * jsdom environment, so this adds no new runtime cost.
 *
 * @param {string} html
 * @returns {string[]} array of inline script bodies (raw text between
 *   the opening and closing tags), in document order.
 */
export function extractInlineScripts(html) {
  const dom = new JSDOM(html);
  const scripts = [];
  for (const el of dom.window.document.querySelectorAll("script")) {
    if (el.hasAttribute("src")) continue;
    // `textContent` returns the raw script body — HTML doesn't decode
    // entities inside `<script>` (it's a "raw text element" per the
    // WHATWG spec), so this matches what the browser hashes for CSP.
    scripts.push(el.textContent ?? "");
  }
  return scripts;
}

/**
 * Compute the SHA-256 hash of each script body and format as a CSP
 * source: `'sha256-<base64>'`. Browsers compare the hash against the
 * literal text between the script tags — whitespace included.
 *
 * @param {string[]} scripts
 * @returns {string[]} CSP-formatted hash sources, deduped + sorted.
 */
export function computeScriptHashes(scripts) {
  const set = new Set();
  for (const body of scripts) {
    const digest = createHash("sha256").update(body, "utf8").digest("base64");
    set.add(`'sha256-${digest}'`);
  }
  return Array.from(set).sort();
}

/**
 * Replace `'unsafe-inline'` in the `script-src` directive with the
 * given hash sources. Other directives (style-src, etc.) are left
 * alone — see `specs/security/csp-phase-b-narrowing.md` for why
 * style-src can't be narrowed yet.
 *
 * @param {string} headersText raw contents of a `_headers` file
 * @param {string[]} hashes CSP-formatted hash sources
 * @returns {string} rewritten headers text
 */
export function narrowCsp(headersText, hashes) {
  if (hashes.length === 0) {
    throw new Error(
      "narrowCsp: refusing to narrow with empty hash set (would break inline scripts)",
    );
  }
  // Find each Content-Security-Policy line and replace `'unsafe-inline'`
  // within the script-src directive only. The regex is anchored on the
  // script-src directive (terminated by `;` or end of header).
  const replacement = hashes.join(" ");
  return headersText.replace(
    /(Content-Security-Policy:[^\n]*?)script-src\s+([^;]*?)(;|\n|$)/gi,
    (full, prefix, sources, terminator) => {
      const narrowed = sources.replace(/\s+'unsafe-inline'/, ` ${replacement}`);
      return `${prefix}script-src ${narrowed.trim()}${terminator}`;
    },
  );
}

/**
 * Recursively find every `.html` file under `dir`.
 * @param {string} dir
 * @returns {string[]}
 */
function findHtmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...findHtmlFiles(full));
    else if (entry.endsWith(".html")) out.push(full);
  }
  return out;
}

/**
 * Read a file, returning `null` for ENOENT rather than throwing. Any
 * other error (permissions, IO) bubbles up.
 *
 * @param {string} path
 * @returns {string | null}
 */
function readFileOrNull(path) {
  try {
    return readFileSync(path, "utf8");
  } catch (err) {
    if (err && /** @type {NodeJS.ErrnoException} */ (err).code === "ENOENT") return null;
    throw err;
  }
}

// --- CLI block ---------------------------------------------------------------

const isMain =
  process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const distDir = resolve(process.cwd(), "dist/client");
  const headersPath = join(distDir, "_headers");

  // Read _headers first — fails fast if either the dir or the file is
  // missing. Bundling the existence check into the read closes the
  // TOCTOU window between `existsSync` and `readFileSync/writeFileSync`.
  const before = readFileOrNull(headersPath);
  if (before === null) {
    console.error(
      `[csp-hashes] ${headersPath} not found — was \`npm run build\` run and did vite copy public/_headers?`,
    );
    process.exit(1);
  }

  let htmlFiles;
  try {
    htmlFiles = findHtmlFiles(distDir);
  } catch (err) {
    if (err && /** @type {NodeJS.ErrnoException} */ (err).code === "ENOENT") {
      console.error(`[csp-hashes] ${distDir} not found — run \`npm run build\` first.`);
      process.exit(1);
    }
    throw err;
  }
  if (htmlFiles.length === 0) {
    console.error(`[csp-hashes] No HTML files found under ${distDir}`);
    process.exit(1);
  }

  const allScripts = [];
  for (const file of htmlFiles) {
    allScripts.push(...extractInlineScripts(readFileSync(file, "utf8")));
  }
  const hashes = computeScriptHashes(allScripts);
  if (hashes.length === 0) {
    console.warn(`[csp-hashes] No inline scripts found — leaving _headers unchanged.`);
    process.exit(0);
  }

  const after = narrowCsp(before, hashes);
  if (after === before) {
    console.warn(
      `[csp-hashes] _headers unchanged — was 'unsafe-inline' already removed from script-src?`,
    );
    process.exit(0);
  }

  writeFileSync(headersPath, after, "utf8");
  console.log(`[csp-hashes] Narrowed script-src in ${headersPath}`);
  console.log(`[csp-hashes] Inline-script hashes (${hashes.length}):`);
  for (const h of hashes) console.log(`  ${h}`);
}
