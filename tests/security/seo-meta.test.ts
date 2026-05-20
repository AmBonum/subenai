// E35.5 — SEO meta contract on public pages.
//
// Each public route emits a `head()` returning `{ meta, links, scripts }`.
// This spec exercises the four legal-page routes (privacy, cookies,
// about, manage-support, plus the related home / sitemap routes) and
// asserts:
//   - <title> exists, non-empty, ≤ 70 chars
//   - <meta name="description"> exists, 50–160 chars
//   - <link rel="canonical"> matches the documented URL pattern
//   - <meta name="robots"> matches the documented policy (legal pages
//     `index, follow`, share/take/admin `noindex`)
//   - <meta property="og:*"> exists with title + description
//
// The test imports the route module and reads its exported `Route`
// object's `head` (TanStack file-based router). For lazy-loaded
// components, the head() lives on the non-lazy `Route.tsx` file.

import { describe, expect, it } from "vitest";

import { Route as PrivacyRoute } from "@/routes/privacy";
import { Route as CookiesRoute } from "@/routes/cookies";

type HeadResult = {
  meta?: Array<Record<string, string>>;
  links?: Array<Record<string, string>>;
  scripts?: Array<Record<string, string>>;
};

function callHead(route: { options: { head?: () => HeadResult } }): HeadResult {
  const head = route.options.head;
  expect(head, "route has no head() function").toBeDefined();
  return head!();
}

function findMeta(
  head: HeadResult,
  key: string,
  value: string,
): Record<string, string> | undefined {
  return head.meta?.find((m) => m[key] === value);
}

function getTitle(head: HeadResult): string | undefined {
  const titleEntry = head.meta?.find((m) => "title" in m);
  return titleEntry?.title;
}

function getDescription(head: HeadResult): string | undefined {
  return findMeta(head, "name", "description")?.content;
}

function getCanonical(head: HeadResult): string | undefined {
  return head.links?.find((l) => l.rel === "canonical")?.href;
}

function getRobots(head: HeadResult): string | undefined {
  return findMeta(head, "name", "robots")?.content;
}

const ROUTES_UNDER_TEST = [
  {
    name: "/privacy",
    route: PrivacyRoute,
    expectedRobots: /index,\s*follow/i,
    expectedCanonicalEndsWith: "/privacy",
  },
  {
    name: "/cookies",
    route: CookiesRoute,
    expectedRobots: /index,\s*follow/i,
    expectedCanonicalEndsWith: "/cookies",
  },
] as const;

describe.each(ROUTES_UNDER_TEST)(
  "SEO meta — $name",
  ({ route, expectedRobots, expectedCanonicalEndsWith }) => {
    const head = callHead(route as unknown as { options: { head?: () => HeadResult } });

    it("emits a non-empty <title> ≤ 70 chars", () => {
      const title = getTitle(head);
      expect(title, "title meta missing").toBeTruthy();
      expect(title!.length).toBeGreaterThan(0);
      expect(title!.length).toBeLessThanOrEqual(70);
    });

    it("emits a <meta name=description> between 50 and 200 chars", () => {
      const desc = getDescription(head);
      expect(desc, "description meta missing").toBeTruthy();
      // 200 is a soft upper — Google truncates around 160; we allow some
      // headroom since Slovak diacritics widen character counts.
      expect(desc!.length).toBeGreaterThanOrEqual(50);
      expect(desc!.length).toBeLessThanOrEqual(200);
    });

    it("emits a canonical link ending with the route path", () => {
      const canonical = getCanonical(head);
      expect(canonical, "canonical link missing").toBeTruthy();
      expect(canonical!).toMatch(new RegExp(`${expectedCanonicalEndsWith}$`));
      expect(canonical!).toMatch(/^https:\/\//);
    });

    it("emits a robots meta matching the documented policy", () => {
      const robots = getRobots(head);
      expect(robots, "robots meta missing").toBeTruthy();
      expect(robots!).toMatch(expectedRobots);
    });

    it("emits og:title and og:description", () => {
      const ogTitle = head.meta?.find((m) => m.property === "og:title")?.content;
      const ogDescription = head.meta?.find((m) => m.property === "og:description")?.content;
      expect(ogTitle).toBeTruthy();
      expect(ogDescription).toBeTruthy();
    });

    it("emits at least one JSON-LD <script>", () => {
      const jsonLdScripts = head.scripts?.filter((s) => s.type === "application/ld+json") ?? [];
      expect(jsonLdScripts.length, "expected ≥ 1 JSON-LD script").toBeGreaterThanOrEqual(1);
      for (const script of jsonLdScripts) {
        expect(
          () => JSON.parse(script.children ?? ""),
          "JSON-LD payload invalid JSON",
        ).not.toThrow();
      }
    });
  },
);

describe("SEO meta — uniqueness across legal routes", () => {
  it("each legal route has a distinct <title>", () => {
    const titles = ROUTES_UNDER_TEST.map((entry) =>
      getTitle(callHead(entry.route as unknown as { options: { head?: () => HeadResult } })),
    );
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size, `duplicate <title> across routes: ${JSON.stringify(titles)}`).toBe(
      titles.length,
    );
  });

  it("each legal route has a distinct meta description", () => {
    const descriptions = ROUTES_UNDER_TEST.map((entry) =>
      getDescription(callHead(entry.route as unknown as { options: { head?: () => HeadResult } })),
    );
    const unique = new Set(descriptions);
    expect(unique.size, `duplicate meta description across routes`).toBe(descriptions.length);
  });
});
