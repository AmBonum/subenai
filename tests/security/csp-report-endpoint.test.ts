// E39 — CSP violation report endpoint contract.
//
// Asserts the public/_headers CSP carries `report-uri /api/csp-report`
// and the handler at functions/api/csp-report.ts behaves per spec:
//   - Always returns 204 No Content (browsers retry on anything else).
//   - Logs at most a one-line summary (no full payload echo / PII).
//   - Default-off: only logs when env CSP_REPORT_LOGGING=1.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { onRequestPost } from "../../functions/api/csp-report";

function makeRequest(body: unknown): Request {
  return new Request("https://subenai.sk/api/csp-report", {
    method: "POST",
    headers: { "content-type": "application/csp-report" },
    body: JSON.stringify(body),
  });
}

function makeCtx(request: Request, env: Record<string, string> = {}) {
  return {
    request,
    env,
    params: {},
    data: {},
    next: () => Promise.resolve(new Response()),
    waitUntil: () => undefined,
    passThroughOnException: () => undefined,
    functionPath: "/api/csp-report",
  };
}

describe("CSP report endpoint — public/_headers contract", () => {
  it("CSP declares report-uri /api/csp-report", () => {
    const headers = readFileSync(resolve(process.cwd(), "public/_headers"), "utf8");
    const csp = headers.match(/Content-Security-Policy:\s*(.+)/)?.[1] ?? "";
    expect(csp).toContain("report-uri /api/csp-report");
  });
});

describe("CSP report endpoint — handler", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("returns 204 on a valid CSP violation report", async () => {
    const req = makeRequest({
      "csp-report": {
        "violated-directive": "script-src",
        "blocked-uri": "https://evil.example/x.js",
        "document-uri": "https://subenai.sk/",
      },
    });
    // minimal synthetic context for the handler
    const resp = await onRequestPost(makeCtx(req, { CSP_REPORT_LOGGING: "1" }));
    expect(resp.status).toBe(204);
    expect(resp.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 204 on malformed JSON without throwing (browsers retry on 4xx/5xx)", async () => {
    const req = new Request("https://subenai.sk/api/csp-report", {
      method: "POST",
      body: "not json",
    });
    // synthetic context
    const resp = await onRequestPost(makeCtx(req, { CSP_REPORT_LOGGING: "1" }));
    expect(resp.status).toBe(204);
  });

  it("default-off: does NOT log when CSP_REPORT_LOGGING is unset", async () => {
    const req = makeRequest({ "csp-report": { "violated-directive": "script-src" } });
    // synthetic context
    await onRequestPost(makeCtx(req, {}));
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("logs a one-line summary when CSP_REPORT_LOGGING=1", async () => {
    const req = makeRequest({
      "csp-report": {
        "violated-directive": "script-src 'self'",
        "blocked-uri": "https://evil.example/x.js",
        "document-uri": "https://subenai.sk/path",
        "source-file": "inline",
        "line-number": 42,
      },
    });
    // synthetic context
    await onRequestPost(makeCtx(req, { CSP_REPORT_LOGGING: "1" }));
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const message = warnSpy.mock.calls[0][0] as string;
    expect(message).toContain("[csp]");
    expect(message).toContain("script-src");
    expect(message).toContain("evil.example");
    // Sanity: no newlines (one-line by design — log injection prevention)
    expect(message).not.toMatch(/\n|\r/);
  });

  it("clamps long fields to bound log-injection risk", async () => {
    const huge = "a".repeat(5000);
    const req = makeRequest({
      "csp-report": { "violated-directive": "script-src", "blocked-uri": huge },
    });
    // synthetic context
    await onRequestPost(makeCtx(req, { CSP_REPORT_LOGGING: "1" }));
    const message = warnSpy.mock.calls[0][0] as string;
    expect(message.length, "log line must be bounded").toBeLessThan(2000);
  });
});
