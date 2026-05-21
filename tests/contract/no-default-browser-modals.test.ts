import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// CLAUDE.md rule "Modals + confirmations (senior UX rule)":
// `window.confirm`, `window.alert`, `window.prompt` are forbidden in
// src/**. Every confirmation goes through `ConfirmDialog`
// (`src/components/admin/ConfirmDialog.tsx`) or shadcn `Dialog`,
// with severity prop driving icon + button colour.
//
// This contract test fails CI if anyone regresses. Comments mentioning
// `window.confirm` (documentation, "we used to do this") are stripped
// before matching so they don't trigger false positives.

const SRC_ROOT = join(__dirname, "..", "..", "src");
const FORBIDDEN_PATTERN = /\bwindow\s*\.\s*(confirm|alert|prompt)\s*\(/;

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      yield* walk(full);
    } else if (/\.(ts|tsx)$/.test(name)) {
      yield full;
    }
  }
}

function stripCommentsAndStrings(source: string): string {
  // Naive strip — good enough for "is this in a comment vs a call?"
  // discrimination. Removes:
  //   - // line comments
  //   - /* … */ block comments
  //   - "double-quoted strings" and 'single-quoted'
  //   - `template strings` (the body, not interpolations — but
  //     a string that literally types `window.confirm(` inside a
  //     template is exotic enough that we accept the false-positive
  //     risk over a full parser dependency)
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/`(?:\\.|[^`\\])*`/g, "``");
}

describe("CLAUDE.md contract: no default browser modals", () => {
  it("src/** contains zero window.confirm / window.alert / window.prompt CALLS", () => {
    const offenders: { file: string; line: number; snippet: string }[] = [];
    for (const filePath of walk(SRC_ROOT)) {
      const raw = readFileSync(filePath, "utf8");
      const stripped = stripCommentsAndStrings(raw);
      if (!FORBIDDEN_PATTERN.test(stripped)) continue;
      // Find the line number for a useful error message — search the
      // ORIGINAL source so the reporter sees the actual offending line.
      const lines = raw.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip comments at the raw level too — we only care about real calls.
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
        if (FORBIDDEN_PATTERN.test(line)) {
          offenders.push({
            file: relative(SRC_ROOT, filePath),
            line: i + 1,
            snippet: line.trim(),
          });
        }
      }
    }
    expect(
      offenders,
      `CLAUDE.md rule: use the severity-aware ConfirmDialog instead of window.confirm/alert/prompt.\n\nOffenders:\n${offenders
        .map((o) => `  src/${o.file}:${o.line}  ${o.snippet}`)
        .join("\n")}`,
    ).toEqual([]);
  });
});
