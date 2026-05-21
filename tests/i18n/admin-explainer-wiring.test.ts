// E47 follow-up — guard against the regression class that shipped in
// PR #100: the wiring script inserted `<AdminPageExplainer />` INSIDE
// `<PageHeader actions={Button}>...</Button>` props on 7 routes because
// its regex matched the first self-closing `/>` after `<PageHeader`
// (which was a nested icon like `<Plus className="..." />`). The bug
// was silent in production because:
//
//   - Vitest tests verified the component in isolation (so they passed)
//   - Playwright (chromium) was `skipping` in CI on path-filter, so the
//     20-page parametrised spec never actually ran against those files
//   - The mis-placed explainer rendered as a fragment of button label
//     (and only when bulk-action conditionals were truthy) so the user
//     never saw a panel under the page header
//
// This static test parses every wired admin route file and asserts:
//   (a) the file imports AdminPageExplainer
//   (b) it instantiates `<AdminPageExplainer pageKey="..." />` exactly once
//   (c) that instantiation is NOT inside an `actions={...}` block of
//       any `<PageHeader>` (the bug pattern), but a sibling at the
//       same JSX nesting level
//
// Runs in <50ms — no DOM, no Playwright; pure regex over source files.
// Add a new admin sidebar entry → add a row to WIRED_ROUTES below,
// otherwise the test fails closed.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

/**
 * Walk `actions={` and return the index of the matching closing `}`,
 * accounting for nested braces inside JSX expressions. Returns -1 if
 * no `actions={` is present in the source.
 */
function findActionsClose(src: string, openIdx: number): number {
  let depth = 0;
  let i = openIdx + "actions={".length;
  while (i < src.length) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      if (depth === 0) return i;
      depth--;
    }
    i++;
  }
  return -1;
}

describe("AdminPageExplainer wiring — every menu route", () => {
  it.each(WIRED_ROUTES_ADMIN)("$file imports AdminPageExplainer", ({ file }) => {
    const src = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(src).toMatch(
      /import\s*\{\s*AdminPageExplainer\s*\}\s*from\s*["']@\/components\/admin\/AdminPageExplainer["']/,
    );
  });

  it.each(WIRED_ROUTES_ADMIN)(
    '$file instantiates <AdminPageExplainer pageKey="$pageKey" /> exactly once',
    ({ file, pageKey }) => {
      const src = readFileSync(resolve(process.cwd(), file), "utf8");
      const pattern = new RegExp(`<AdminPageExplainer\\s+pageKey=["']${pageKey}["']\\s*/>`, "g");
      const matches = src.match(pattern) ?? [];
      expect(matches.length).toBe(1);
    },
  );

  it.each(WIRED_ROUTES_ADMIN)(
    "$file places <AdminPageExplainer> OUTSIDE PageHeader actions={...} (regression guard for PR #100 bug)",
    ({ file }) => {
      const src = readFileSync(resolve(process.cwd(), file), "utf8");
      const explainerIdx = src.indexOf("<AdminPageExplainer pageKey=");
      expect(explainerIdx, "explainer instantiation not found").toBeGreaterThan(-1);

      // Find every `actions={` occurrence and check that the explainer is
      // not inside any of them.
      let cursor = 0;
      while (true) {
        const actionsIdx = src.indexOf("actions={", cursor);
        if (actionsIdx === -1) break;
        const closeIdx = findActionsClose(src, actionsIdx);
        if (closeIdx === -1) {
          throw new Error(`Unbalanced actions={...} starting at ${file}:${actionsIdx}`);
        }
        const insideActions = explainerIdx > actionsIdx && explainerIdx < closeIdx;
        expect(
          insideActions,
          `<AdminPageExplainer> is nested INSIDE an actions={...} prop of <PageHeader> ` +
            `at ${file} char ${explainerIdx}. It must be a sibling, not a child.`,
        ).toBe(false);
        cursor = closeIdx + 1;
      }
    },
  );

  it.each(WIRED_ROUTES_ADMIN)(
    "$file places <AdminPageExplainer> AFTER the <PageHeader> closing line (sibling order)",
    ({ file }) => {
      const src = readFileSync(resolve(process.cwd(), file), "utf8");
      const lines = src.split("\n");

      // Find the line on which PageHeader's opening element opens.
      const pageHeaderOpenLine = lines.findIndex((l) => /<PageHeader\b/.test(l));
      expect(pageHeaderOpenLine, "no <PageHeader in file").toBeGreaterThan(-1);

      // From that line onward, find the first line whose trimmed content
      // is exactly `/>` — that's the closing of PageHeader's opening tag
      // when it's spread across multiple lines, OR the inline self-closing
      // case `<PageHeader ... />` on a single line.
      let pageHeaderCloseLine = -1;
      const inlineSelfClose = lines[pageHeaderOpenLine].match(/<PageHeader[^>]*\/>\s*$/);
      if (inlineSelfClose) {
        pageHeaderCloseLine = pageHeaderOpenLine;
      } else {
        // Multi-line PageHeader. The closing `/>` is on its own line. Skip
        // any nested self-closing JSX inside actions={...} by tracking a
        // simple JSX-brace depth: `actions={` opens, `}` at depth 0 closes.
        let braceDepth = 0;
        for (let i = pageHeaderOpenLine + 1; i < lines.length; i++) {
          const line = lines[i];
          // Tally `{` and `}` on this line to track JSX expression depth
          // inside PageHeader's props (mostly `actions={...}`).
          for (const ch of line) {
            if (ch === "{") braceDepth++;
            else if (ch === "}") braceDepth--;
          }
          // Only accept `/>` as the PageHeader close when we are back at
          // depth 0 (i.e. outside every `actions={...}` block).
          if (braceDepth === 0 && /^\s*\/>\s*$/.test(line)) {
            pageHeaderCloseLine = i;
            break;
          }
        }
      }
      expect(pageHeaderCloseLine, "could not locate PageHeader closing />").toBeGreaterThan(-1);

      const explainerLine = lines.findIndex((l) => /<AdminPageExplainer\s+pageKey=/.test(l));
      expect(explainerLine, "no <AdminPageExplainer found").toBeGreaterThan(-1);
      expect(
        explainerLine > pageHeaderCloseLine,
        `<AdminPageExplainer> at line ${explainerLine + 1} but <PageHeader ... /> closes at ` +
          `line ${pageHeaderCloseLine + 1}. The explainer must render AFTER the page header, ` +
          `not before or within it.`,
      ).toBe(true);
    },
  );
});

describe("AppPageExplainer wiring — every menu route", () => {
  it.each(WIRED_ROUTES_APP)("$file imports AppPageExplainer", ({ file }) => {
    const src = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(src).toMatch(
      /import\s*\{\s*AppPageExplainer\s*\}\s*from\s*["']@\/components\/user\/AppPageExplainer["']/,
    );
  });

  it.each(WIRED_ROUTES_APP)(
    '$file instantiates <AppPageExplainer pageKey="$pageKey" /> exactly once',
    ({ file, pageKey }) => {
      const src = readFileSync(resolve(process.cwd(), file), "utf8");
      const pattern = new RegExp(`<AppPageExplainer\\s+pageKey=["']${pageKey}["']\\s*/>`, "g");
      const matches = src.match(pattern) ?? [];
      expect(matches.length).toBe(1);
    },
  );

  it.each(WIRED_ROUTES_APP)(
    "$file places <AppPageExplainer> OUTSIDE PageHeader actions={...} (regression guard for PR #100 bug)",
    ({ file }) => {
      const src = readFileSync(resolve(process.cwd(), file), "utf8");
      const explainerIdx = src.indexOf("<AppPageExplainer pageKey=");
      expect(explainerIdx, "explainer instantiation not found").toBeGreaterThan(-1);

      let cursor = 0;
      while (true) {
        const actionsIdx = src.indexOf("actions={", cursor);
        if (actionsIdx === -1) break;
        const closeIdx = findActionsClose(src, actionsIdx);
        if (closeIdx === -1) {
          throw new Error(`Unbalanced actions={...} starting at ${file}:${actionsIdx}`);
        }
        const insideActions = explainerIdx > actionsIdx && explainerIdx < closeIdx;
        expect(
          insideActions,
          `<AppPageExplainer> is nested INSIDE an actions={...} prop of <PageHeader> ` +
            `at ${file} char ${explainerIdx}. It must be a sibling, not a child.`,
        ).toBe(false);
        cursor = closeIdx + 1;
      }
    },
  );

  it.each(WIRED_ROUTES_APP)(
    "$file places <AppPageExplainer> AFTER the <PageHeader> closing line (sibling order)",
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

      const explainerLine = lines.findIndex((l) => /<AppPageExplainer\s+pageKey=/.test(l));
      expect(explainerLine, "no <AppPageExplainer found").toBeGreaterThan(-1);
      expect(
        explainerLine > pageHeaderCloseLine,
        `<AppPageExplainer> at line ${explainerLine + 1} but <PageHeader ... /> closes at ` +
          `line ${pageHeaderCloseLine + 1}. The explainer must render AFTER the page header, ` +
          `not before or within it.`,
      ).toBe(true);
    },
  );
});
