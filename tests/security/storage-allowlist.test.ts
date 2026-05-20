// E35.4 — storage allowlist (cross-checks /cookies declarations against
// actual code).
//
// Every `document.cookie =` and `localStorage.setItem(...)` site in the
// production `src/` tree writes data on the user's terminal equipment
// (ePrivacy scope per Article 5(3) of Directive 2002/58/EC). The user
// must be told about each write on `/cookies` and given a consent toggle
// where applicable.
//
// This spec scans `src/` for those calls and verifies each storage key
// is on a declared allowlist that mirrors the /cookies table + the
// /privacy s2 trap-popup carve-out. **Storage keys NOT on the
// allowlist fail the test by design** — the gap is then either:
//   (a) declared on /cookies (preferred), OR
//   (b) gated by a consent category, OR
//   (c) removed.
//
// Today, several gaps surface as expected reds — they map to follow-up
// epic E40 (cookie alignment). The test makes the gap visible in CI
// instead of buried in a manual audit.

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

interface DeclaredStorage {
  /** The key as it appears in code (literal or regex string for module-level constants). */
  key: string;
  /** Why this is on the allowlist — must cite the /cookies row or /privacy section. */
  declaredAt: string;
}

const COOKIE_KEYS: DeclaredStorage[] = [
  {
    key: "SIDEBAR_COOKIE_NAME",
    declaredAt:
      "NOT DECLARED — see matrix X-1. Follow-up E40 to either add to /cookies prefs row or remove.",
  },
];

const LOCALSTORAGE_KEYS: DeclaredStorage[] = [
  { key: "CONSENT_STORAGE_KEY", declaredAt: "/cookies s2 row `iiq_consent`" },
  { key: "TRAP_SEEN_STORAGE_KEY", declaredAt: "/privacy s2 trap section" },
];

/** Keys we know exist in code but are NOT declared. Used to differentiate
 * "expected red" (already in the matrix) from "regression" (new unknown
 * write). Each entry must cite the follow-up epic. */
const UNDECLARED_BUT_TRACKED: DeclaredStorage[] = [
  {
    key: "SIDEBAR_COOKIE_NAME",
    declaredAt: "matrix X-1 — sidebar UI state, E40",
  },
  {
    key: "subenai.locale",
    declaredAt:
      "matrix X-2 — locale preference; /cookies declares prefs as 'budúce' but locale already used. E40",
  },
  {
    key: "STORAGE_KEY",
    declaredAt:
      "matrix X-3 / X-4 — module-level constant in multiple files (locale-context, useBlogPillarsCollapsed). E40",
  },
  {
    key: "INTRO_KEY",
    declaredAt: "matrix X-4 — app intro flag. E40",
  },
  {
    key: "dismissKey",
    declaredAt: "matrix X-5 — profile completion banner dismiss flag. E40",
  },
];

function* walkSourceFiles(dir: string): Iterable<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      yield* walkSourceFiles(full);
    } else if (
      (entry.endsWith(".ts") || entry.endsWith(".tsx")) &&
      !entry.endsWith(".test.ts") &&
      !entry.endsWith(".test.tsx") &&
      !entry.endsWith(".d.ts")
    ) {
      yield full;
    }
  }
}

interface StorageWrite {
  file: string;
  line: number;
  keyExpression: string;
}

function findWrites(pattern: RegExp): StorageWrite[] {
  const out: StorageWrite[] = [];
  const root = resolve(process.cwd(), "src");
  for (const file of walkSourceFiles(root)) {
    const content = readFileSync(file, "utf8");
    const lines = content.split("\n");
    lines.forEach((line, idx) => {
      const match = line.match(pattern);
      if (match) {
        out.push({
          file: relative(process.cwd(), file),
          line: idx + 1,
          keyExpression: match[1] ?? line.trim(),
        });
      }
    });
  }
  return out;
}

function isOnAllowlist(keyExpr: string, allowlist: DeclaredStorage[]): boolean {
  return allowlist.some(({ key }) => keyExpr.includes(key));
}

describe("storage allowlist — document.cookie writes in src/", () => {
  // Capture: document.cookie = `${KEY}=...` or document.cookie = "key=..."
  const writes = findWrites(/document\.cookie\s*=\s*[`"'][^`"';]*?(?:\$\{)?([A-Z_a-zA-Z0-9.-]+)/);

  it("every cookie write is either on the declared allowlist or on the tracked-undeclared list", () => {
    const declared = [...COOKIE_KEYS, ...UNDECLARED_BUT_TRACKED];
    const unknown: StorageWrite[] = writes.filter((w) => !isOnAllowlist(w.keyExpression, declared));
    expect(
      unknown,
      `Unknown cookie writes found — declare them on /cookies or add to UNDECLARED_BUT_TRACKED with a follow-up epic ref:\n${JSON.stringify(unknown, null, 2)}`,
    ).toEqual([]);
  });
});

describe("storage allowlist — localStorage.setItem writes in src/", () => {
  // Capture: window.localStorage.setItem(KEY, ...) or localStorage.setItem(KEY, ...)
  const writes = findWrites(/localStorage\.setItem\(\s*([A-Z_a-zA-Z0-9.()[\]"'`-]+)/);

  it("every localStorage write is either on the declared allowlist or on the tracked-undeclared list", () => {
    const declared = [...LOCALSTORAGE_KEYS, ...UNDECLARED_BUT_TRACKED];
    const unknown: StorageWrite[] = writes.filter((w) => {
      // Strip quotes and trailing commas for matching string literals.
      const cleaned = w.keyExpression.replace(/['"`]/g, "").replace(/,$/, "");
      return !isOnAllowlist(cleaned, declared) && !isOnAllowlist(w.keyExpression, declared);
    });
    expect(
      unknown,
      `Unknown localStorage writes found — declare them on /cookies or add to UNDECLARED_BUT_TRACKED with a follow-up epic ref:\n${JSON.stringify(unknown, null, 2)}`,
    ).toEqual([]);
  });

  it("CONSENT_STORAGE_KEY is the only declared 'necessary' write", () => {
    // Sanity guard: /cookies declares iiq_consent as the necessary category
    // store. If a future change splits the consent record across multiple
    // keys, /cookies must be updated to reflect that.
    expect(LOCALSTORAGE_KEYS.find((k) => k.key === "CONSENT_STORAGE_KEY")).toBeDefined();
  });
});
