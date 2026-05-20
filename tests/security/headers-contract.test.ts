// E35.5 — security headers contract.
//
// `public/_headers` is the single line of defence for CSP, HSTS,
// frame-ancestors, content-type sniffing, referer, and permissions.
// This spec reads the served file and asserts every contract from
// `headers-contract.ts` still holds.
//
// Failure modes that should NEVER happen silently:
//   - HSTS max-age dropped below 1 year (preload reset)
//   - X-Frame-Options removed (clickjacking)
//   - CSP `'unsafe-eval'` added (script injection)
//   - Wildcard host appended to a directive (data exfiltration channel)
//   - Connect-src widened to a tracker domain (privacy bleed)
//
// When CSP needs to widen for a legitimate reason (new processor,
// new feature), update the allowlist in `headers-contract.ts` in the
// SAME pull request that edits `_headers`. The diff makes the review
// trivial.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  CSP_ALLOWLIST,
  CSP_FORBIDDEN_TOKENS,
  CSP_REQUIRED_DIRECTIVES,
  EXPECTED_HEADERS,
} from "./headers-contract";

const HEADERS_PATH = resolve(process.cwd(), "public/_headers");
const HEADERS_TEXT = readFileSync(HEADERS_PATH, "utf8");

function findHeader(name: string): string | null {
  const lower = name.toLowerCase();
  const lines = HEADERS_TEXT.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const colonIdx = line.indexOf(":");
    if (colonIdx < 1) continue;
    const headerName = line.slice(0, colonIdx).trim().toLowerCase();
    if (headerName === lower) {
      return line.slice(colonIdx + 1).trim();
    }
  }
  return null;
}

function parseCsp(value: string): Map<string, string[]> {
  const directives = new Map<string, string[]>();
  for (const rawDirective of value.split(";")) {
    const directive = rawDirective.trim();
    if (!directive) continue;
    const [name, ...sources] = directive.split(/\s+/);
    directives.set(name.toLowerCase(), sources);
  }
  return directives;
}

describe("public/_headers — fundamental hardening", () => {
  it("file exists and is non-empty", () => {
    expect(HEADERS_TEXT.length).toBeGreaterThan(100);
  });

  it("sets Strict-Transport-Security with at least 1 year max-age + includeSubDomains + preload", () => {
    const hsts = findHeader("Strict-Transport-Security");
    expect(hsts).not.toBeNull();
    const maxAgeMatch = hsts!.match(/max-age=(\d+)/);
    expect(maxAgeMatch, `expected max-age in HSTS, got "${hsts}"`).not.toBeNull();
    const maxAge = Number(maxAgeMatch![1]);
    expect(maxAge).toBeGreaterThanOrEqual(EXPECTED_HEADERS.hstsMinMaxAge);
    expect(hsts).toMatch(/includeSubDomains/i);
    expect(hsts).toMatch(/preload/i);
  });

  it("sets X-Frame-Options: DENY", () => {
    expect(findHeader("X-Frame-Options")).toBe(EXPECTED_HEADERS.xFrameOptions);
  });

  it("sets X-Content-Type-Options: nosniff", () => {
    expect(findHeader("X-Content-Type-Options")).toBe(EXPECTED_HEADERS.xContentTypeOptions);
  });

  it("sets Referrer-Policy: strict-origin-when-cross-origin", () => {
    expect(findHeader("Referrer-Policy")).toBe(EXPECTED_HEADERS.referrerPolicy);
  });

  it("denies camera, microphone, geolocation, and interest-cohort via Permissions-Policy", () => {
    const policy = findHeader("Permissions-Policy");
    expect(policy).not.toBeNull();
    for (const feature of EXPECTED_HEADERS.permissionsPolicyDeniedFeatures) {
      expect(
        policy!.toLowerCase(),
        `Permissions-Policy must deny ${feature} (empty allowlist)`,
      ).toMatch(new RegExp(`${feature}\\s*=\\s*\\(\\s*\\)`));
    }
  });
});

describe("public/_headers — Content-Security-Policy", () => {
  const csp = findHeader("Content-Security-Policy");
  const directives = csp ? parseCsp(csp) : new Map<string, string[]>();

  it("declares a Content-Security-Policy", () => {
    expect(csp, "CSP header missing entirely").not.toBeNull();
  });

  for (const required of CSP_REQUIRED_DIRECTIVES) {
    it(`contains the required directive: ${required}`, () => {
      expect(csp).toContain(required);
    });
  }

  for (const forbidden of CSP_FORBIDDEN_TOKENS) {
    it(`does NOT contain the forbidden source: ${forbidden}`, () => {
      // Bare `*` as a standalone source is the disallowed pattern; we
      // intentionally permit subdomain wildcards like `https://*.supabase.co`.
      // Iterate every directive's sources and reject only exact matches.
      let exactMatch = false;
      for (const [, sources] of directives) {
        if (sources.includes(forbidden)) {
          exactMatch = true;
          break;
        }
      }
      expect(exactMatch, `forbidden CSP source "${forbidden}" found as a standalone token`).toBe(
        false,
      );
    });
  }

  for (const [directive, allowed] of Object.entries(CSP_ALLOWLIST)) {
    it(`directive "${directive}" sources are a subset of the documented allowlist`, () => {
      const sources = directives.get(directive);
      expect(sources, `directive "${directive}" missing from CSP`).toBeDefined();
      const allowedSet = new Set<string>(allowed);
      for (const source of sources!) {
        expect(
          allowedSet.has(source),
          [
            `Unauthorized CSP source "${source}" in directive "${directive}".`,
            `If this is intentional, add it to CSP_ALLOWLIST in tests/security/headers-contract.ts.`,
          ].join(" "),
        ).toBe(true);
      }
    });
  }
});
