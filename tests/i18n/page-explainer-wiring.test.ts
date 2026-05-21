// E47/E48 — structural regression guard against the bug class that
// shipped in PR #100: the wiring script inserted `<AdminPageExplainer />`
// INSIDE `<PageHeader actions={Button}>...</Button>` props on 7 routes
// because its regex matched the first self-closing `/>` after `<PageHeader`
// (which was a nested icon like `<Plus className="..." />`). The bug was
// silent in production because:
//
//   - Vitest tests verified the component in isolation (so they passed)
//   - Playwright (chromium) was `skipping` in CI on path-filter, so the
//     parametrised spec never actually ran against those files
//   - The mis-placed explainer rendered as a fragment of button label
//     (and only when bulk-action conditionals were truthy) so the user
//     never saw a panel under the page header
//
// This static test parses every wired route file and asserts:
//   (a) the file imports the relevant Explainer component
//   (b) it instantiates `<XPageExplainer pageKey="..." />` exactly once
//   (c) that instantiation is NOT inside an `actions={...}` block of
//       a <PageHeader> (the bug pattern), but a sibling at the same JSX
//       nesting level
//   (d) the instantiation line appears AFTER the <PageHeader> closing line
//
// **Reality check (E48 ultrareview):** also scans the routes directory
// recursively for any `<XPageExplainer pageKey=` instance and asserts
// each one is listed in WIRED_ROUTES_*. This catches the symmetric bug
// class where a new route ships an explainer but isn't added to the list
// — without it, the wiring test would silently skip the new route and a
// future #100-style mis-placement would go uncaught.
//
// Runs in <50ms — no DOM, no Playwright; pure regex over source files.

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

interface WiredRoute {
  file: string;
  pageKey: string;
}

const WIRED_ROUTES_ADMIN: WiredRoute[] = [
  { file: "src/routes/admin/index.lazy.tsx", pageKey: "dashboard" },
  { file: "src/routes/admin/tests.index.lazy.tsx", pageKey: "tests" },
  { file: "src/routes/admin/quick-test.lazy.tsx", pageKey: "quick_test" },
  { file: "src/routes/admin/share-card.lazy.tsx", pageKey: "share_card" },
  { file: "src/routes/admin/questions.lazy.tsx", pageKey: "questions" },
  { file: "src/routes/admin/answer-sets.index.lazy.tsx", pageKey: "answer_sets" },
  { file: "src/routes/admin/trainings.lazy.tsx", pageKey: "trainings" },
  { file: "src/routes/admin/users.lazy.tsx", pageKey: "users" },
  { file: "src/routes/admin/categories.lazy.tsx", pageKey: "categories" },
  { file: "src/routes/admin/reports.lazy.tsx", pageKey: "reports" },
  { file: "src/routes/admin/support.lazy.tsx", pageKey: "support" },
  { file: "src/routes/admin/blog/index.lazy.tsx", pageKey: "blog" },
  { file: "src/routes/admin/pages.index.lazy.tsx", pageKey: "pages" },
  { file: "src/routes/admin/navigation.lazy.tsx", pageKey: "navigation" },
  { file: "src/routes/admin/header.lazy.tsx", pageKey: "header" },
  { file: "src/routes/admin/footer.lazy.tsx", pageKey: "footer" },
  { file: "src/routes/admin/dsr.lazy.tsx", pageKey: "dsr" },
  { file: "src/routes/admin/dpa-requests.lazy.tsx", pageKey: "dpa_requests" },
  { file: "src/routes/admin/templates.lazy.tsx", pageKey: "templates_moderation" },
  { file: "src/routes/admin/settings.lazy.tsx", pageKey: "settings" },
  { file: "src/routes/admin/security.lazy.tsx", pageKey: "security" },
];

const WIRED_ROUTES_APP: WiredRoute[] = [
  { file: "src/routes/app.index.tsx", pageKey: "dashboard" },
  { file: "src/routes/app.tests.index.tsx", pageKey: "tests" },
  { file: "src/routes/app.edu-tests.index.lazy.tsx", pageKey: "edu_tests" },
  { file: "src/routes/app.templates.tsx", pageKey: "templates" },
  { file: "src/routes/app.library.tsx", pageKey: "library" },
  { file: "src/routes/app.audiences.tsx", pageKey: "audiences" },
  { file: "src/routes/app.history.tsx", pageKey: "history" },
  { file: "src/routes/app.notifications.tsx", pageKey: "notifications" },
  { file: "src/routes/app.teams.tsx", pageKey: "teams" },
  { file: "src/routes/app.help.tsx", pageKey: "help" },
  { file: "src/routes/app.account.profile.tsx", pageKey: "profile" },
];

interface VariantConfig {
  describeName: string;
  componentName: string;
  importPath: string;
  routes: WiredRoute[];
  /** Directory to recursively scan for stray explainer instances. */
  routesDir: string;
  /** Filename predicate for which files to include in the reality check. */
  filePredicate: (file: string) => boolean;
}

const VARIANTS: VariantConfig[] = [
  {
    describeName: "AdminPageExplainer wiring — every menu route",
    componentName: "AdminPageExplainer",
    importPath: "@/components/admin/AdminPageExplainer",
    routes: WIRED_ROUTES_ADMIN,
    routesDir: "src/routes/admin",
    filePredicate: (f) => f.endsWith(".tsx"),
  },
  {
    describeName: "AppPageExplainer wiring — every menu route",
    componentName: "AppPageExplainer",
    importPath: "@/components/user/AppPageExplainer",
    routes: WIRED_ROUTES_APP,
    routesDir: "src/routes",
    // Only flat `app.*.tsx` routes — exclude `admin/*` directory and
    // unrelated top-level routes.
    filePredicate: (f) => f.startsWith("app.") && f.endsWith(".tsx"),
  },
];

/** Escape every regex metacharacter so a value can be safely embedded in
 *  a `new RegExp(...)`. CodeQL flagged a prior `replace(/\//g, "\\/")`
 *  one-liner as incomplete escaping (missed `\`, `.`, `+`, etc.). */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Find the matching closing `}` of a JSX expression that starts at a given
 * `{` position (e.g. after `actions={`). Returns -1 if unbalanced.
 */
function findExpressionClose(src: string, openIdx: number): number {
  let depth = 0;
  let i = openIdx;
  while (i < src.length) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

/**
 * Locate every `<PageHeader ... >` opening element in `src` and, for each,
 * return the `[start, end]` character offsets of any `actions={...}` block
 * it contains. Other components' `actions={...}` props are ignored — this
 * matters because the original bug was specifically about PageHeader's
 * actions prop wrapping the explainer.
 */
function findPageHeaderActionsBlocks(src: string): Array<[number, number]> {
  const blocks: Array<[number, number]> = [];
  const phRegex = /<PageHeader\b/g;
  let m: RegExpExecArray | null;
  while ((m = phRegex.exec(src)) !== null) {
    // Find the end of the PageHeader opening element. Two shapes:
    // (a) inline self-closing `<PageHeader ... />` — closing is the first
    //     `/>` we hit at angle-bracket depth 0
    // (b) multi-line `<PageHeader\n  ...\n/>` — same logic, since we don't
    //     walk into nested JSX (we just track JSX-attribute braces)
    let i = m.index + "<PageHeader".length;
    let braceDepth = 0;
    let phEnd = -1;
    while (i < src.length - 1) {
      const ch = src[i];
      if (ch === "{") braceDepth++;
      else if (ch === "}") braceDepth--;
      else if (braceDepth === 0 && ch === "/" && src[i + 1] === ">") {
        phEnd = i + 2;
        break;
      } else if (braceDepth === 0 && ch === ">") {
        // PageHeader with children (rare in our codebase; bail to be safe).
        phEnd = i + 1;
        break;
      }
      i++;
    }
    if (phEnd === -1) continue;

    const phSlice = src.slice(m.index, phEnd);
    const actionsOffset = phSlice.indexOf("actions={");
    if (actionsOffset === -1) continue;
    const openIdx = m.index + actionsOffset + "actions=".length; // position of `{`
    const closeIdx = findExpressionClose(src, openIdx);
    if (closeIdx === -1) continue;
    blocks.push([openIdx, closeIdx]);
  }
  return blocks;
}

/** Recursively walk a directory and yield matching file relative paths. */
function* walkFiles(dir: string, predicate: (f: string) => boolean): Iterable<string> {
  const root = resolve(process.cwd(), dir);
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      yield* walkFiles(relative(process.cwd(), full), predicate);
    } else if (predicate(entry)) {
      yield relative(process.cwd(), full);
    }
  }
}

for (const variant of VARIANTS) {
  describe(variant.describeName, () => {
    it.each(variant.routes)(`$file imports ${variant.componentName}`, ({ file }) => {
      const src = readFileSync(resolve(process.cwd(), file), "utf8");
      const importRe = new RegExp(
        `import\\s*\\{\\s*${escapeRegex(variant.componentName)}\\s*\\}\\s*from\\s*["']${escapeRegex(variant.importPath)}["']`,
      );
      expect(src).toMatch(importRe);
    });

    it.each(variant.routes)(
      `$file instantiates <${variant.componentName} pageKey="$pageKey" /> exactly once`,
      ({ file, pageKey }) => {
        const src = readFileSync(resolve(process.cwd(), file), "utf8");
        const pattern = new RegExp(
          `<${variant.componentName}\\s+pageKey=["']${pageKey}["']\\s*/>`,
          "g",
        );
        const matches = src.match(pattern) ?? [];
        expect(matches.length).toBe(1);
      },
    );

    it.each(variant.routes)(
      `$file places <${variant.componentName}> OUTSIDE PageHeader actions={...} (regression guard for PR #100 bug)`,
      ({ file }) => {
        const src = readFileSync(resolve(process.cwd(), file), "utf8");
        const explainerIdx = src.indexOf(`<${variant.componentName} pageKey=`);
        expect(explainerIdx, "explainer instantiation not found").toBeGreaterThan(-1);

        // E48 ultrareview — scoped to `<PageHeader>`'s actions={} only.
        // Previously the scanner walked EVERY `actions={` in the file
        // (could false-pass on unrelated components like DropdownMenu).
        const phBlocks = findPageHeaderActionsBlocks(src);
        for (const [openIdx, closeIdx] of phBlocks) {
          const insideActions = explainerIdx > openIdx && explainerIdx < closeIdx;
          expect(
            insideActions,
            `<${variant.componentName}> is nested INSIDE a <PageHeader> actions={...} prop at ` +
              `${file} char ${explainerIdx}. It must be a sibling, not a child.`,
          ).toBe(false);
        }
      },
    );

    it.each(variant.routes)(
      `$file places <${variant.componentName}> AFTER the <PageHeader> closing line (sibling order)`,
      ({ file }) => {
        const src = readFileSync(resolve(process.cwd(), file), "utf8");
        const lines = src.split("\n");

        const pageHeaderOpenLine = lines.findIndex((l) => /<PageHeader\b/.test(l));
        expect(pageHeaderOpenLine, "no <PageHeader in file").toBeGreaterThan(-1);

        let pageHeaderCloseLine = -1;
        const inlineSelfClose = lines[pageHeaderOpenLine].match(/<PageHeader[^>]*\/>\s*$/);
        if (inlineSelfClose) {
          pageHeaderCloseLine = pageHeaderOpenLine;
        } else {
          let braceDepth = 0;
          for (let i = pageHeaderOpenLine + 1; i < lines.length; i++) {
            const line = lines[i];
            for (const ch of line) {
              if (ch === "{") braceDepth++;
              else if (ch === "}") braceDepth--;
            }
            if (braceDepth === 0 && /^\s*\/>\s*$/.test(line)) {
              pageHeaderCloseLine = i;
              break;
            }
          }
        }
        expect(pageHeaderCloseLine, "could not locate PageHeader closing />").toBeGreaterThan(-1);

        const explainerLine = lines.findIndex((l) =>
          new RegExp(`<${variant.componentName}\\s+pageKey=`).test(l),
        );
        expect(explainerLine, "no explainer instantiation found").toBeGreaterThan(-1);
        expect(
          explainerLine > pageHeaderCloseLine,
          `<${variant.componentName}> at line ${explainerLine + 1} but <PageHeader ... /> closes at ` +
            `line ${pageHeaderCloseLine + 1}. The explainer must render AFTER the page header.`,
        ).toBe(true);
      },
    );

    // E48 ultrareview — reality check. Scan the routes directory for any
    // explainer instance and assert it's in the WIRED_ROUTES list. Without
    // this, a developer who adds a new admin sidebar entry + wires the
    // explainer in that route file BUT forgets to add it to WIRED_ROUTES
    // would silently skip the wiring guard for the new route, and a
    // future #100-style mis-placement bug would ship undetected.
    it(`every <${variant.componentName} pageKey=...> in ${variant.routesDir}/ is listed in WIRED_ROUTES`, () => {
      const found = new Set<string>();
      for (const file of walkFiles(variant.routesDir, variant.filePredicate)) {
        const src = readFileSync(resolve(process.cwd(), file), "utf8");
        if (src.includes(`<${variant.componentName} pageKey=`)) {
          found.add(file);
        }
      }
      const listed = new Set(variant.routes.map((r) => r.file));
      const missing = Array.from(found).filter((f) => !listed.has(f));
      expect(
        missing,
        `These files contain <${variant.componentName}> but are not in WIRED_ROUTES_*: ` +
          `add them to keep the wiring test honest.\n${JSON.stringify(missing, null, 2)}`,
      ).toEqual([]);
    });
  });
}
