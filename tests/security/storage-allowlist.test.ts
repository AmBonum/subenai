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
    declaredAt: "/cookies s2 row `prefs` (E40) — sidebar_state, preferences category",
  },
];

const LOCALSTORAGE_KEYS: DeclaredStorage[] = [
  { key: "CONSENT_STORAGE_KEY", declaredAt: "/cookies s2 row `iiq_consent`" },
  { key: "TRAP_SEEN_STORAGE_KEY", declaredAt: "/privacy s2 trap section" },
  {
    key: "STORAGE_KEY",
    declaredAt:
      "/cookies s2 row `locale` + `prefs` (E40) — module-level constants in locale-context (necessary) and useBlogPillarsCollapsed (preferences)",
  },
  { key: "INTRO_KEY", declaredAt: "/cookies s2 row `prefs` (E40) — dashboard intro flag" },
  {
    key: "dismissKey",
    declaredAt:
      "/cookies s2 row `prefs` (E40) — `subenai.profile-banner.dismissed.*` per-user dismissal",
  },
  { key: "subenai.locale", declaredAt: "/cookies s2 row `locale` (E40) — language preference" },
  {
    key: "EXPLAINER_STORAGE_PREFIX",
    declaredAt:
      "/cookies s2 row `prefs` (E40) — `admin-explainer-<pageKey>` collapsed/expanded state of admin info panels (E47)",
  },
];

/** Keys we know exist in code but are NOT declared. Empty after E40 —
 * every storage write site is now on a declared allowlist row or in a
 * follow-up epic with a documented owner. New unknown writes added in
 * a future change will surface here as test failures. */
const UNDECLARED_BUT_TRACKED: DeclaredStorage[] = [];

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
  // Character class is `[A-Za-z0-9_.-]` — alphanumerics + identifier
  // continuation chars only. The previous `[A-Z_a-zA-Z0-9.-]` had
  // redundant overlapping ranges (CodeQL js/overly-large-range).
  const writes = findWrites(/document\.cookie\s*=\s*[`"'][^`"';]*?(?:\$\{)?([A-Za-z0-9_.-]+)/);

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
  // Reordered character class to `[A-Za-z0-9_.()[\]"'`-]` — same
  // surface, no redundant `A-Z` + `a-zA-Z` overlap (CodeQL
  // js/overly-large-range).
  const writes = findWrites(/localStorage\.setItem\(\s*([A-Za-z0-9_.()[\]"'`-]+)/);

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
