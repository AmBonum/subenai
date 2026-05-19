import { Fragment, type ReactNode } from "react";

// E27 — utility for converting plain-text path tokens in i18n
// strings into clickable links.
//
// Example input:  "podpor projekt na /support."
// Example output: <>"podpor projekt na " <a href="/support">/support</a> "."</>
//
// Why this exists: FAQ answers (and similar long-form i18n strings)
// reference internal routes like /support, /test, /courses/email-phishing.
// Plain text is unclickable — users see the path, copy it, paste it
// into the URL bar. Tokenizing at render time makes the same paths
// follow-able with one click.
//
// Why plain <a> (not @tanstack/react-router <Link>): TanStack Router
// type-checks `to` against the route tree, which won't accept a
// dynamic string from a regex match. Plain <a> causes a full reload
// (small cost for the rare FAQ link-click) and works for any path,
// including ones outside the static route tree.
//
// Why regex (not i18n placeholders): keeps the i18n bundle as plain
// strings — translators don't have to learn token syntax. Every
// future answer that mentions a path gets linkified for free.
//
// What matches:
//   /support, /test, /tests/eshop, /test/builder, /courses/email-phishing
// What does NOT match:
//   //double, /5 (no leading letter), /Test (uppercase), /test.html
//   (trailing punctuation), regex `/foo/` markers in code

// First char after slash must be a lowercase letter (so /5 or //foo
// don't match). Subsequent chars can be [a-z0-9-]. Path segments are
// separated by single slashes; no trailing slash captured.
const PATH_RE = /\/[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*/g;

export function linkifyPaths(text: string, options: { className?: string } = {}): ReactNode {
  const linkClassName =
    options.className ??
    "font-medium text-primary underline underline-offset-2 hover:text-primary/80";

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  // String.prototype.matchAll returns ALL non-overlapping matches in
  // order. Each match has .index — start position in the source.
  for (const match of text.matchAll(PATH_RE)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      parts.push(text.slice(lastIndex, idx));
    }
    parts.push(
      <a
        key={`p-${idx}`}
        href={match[0]}
        className={linkClassName}
        data-testid={`linkify-path-${match[0].replace(/\//g, "-").replace(/^-/, "")}`}
      >
        {match[0]}
      </a>,
    );
    lastIndex = idx + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // Optimisation: when no paths matched at all, return the original
  // string so React doesn't allocate a Fragment for nothing.
  if (parts.length === 0) return text;
  if (parts.length === 1 && typeof parts[0] === "string") return parts[0];
  return <Fragment>{parts}</Fragment>;
}
