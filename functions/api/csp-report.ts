// E39 / CSP — Content-Security-Policy violation report receiver.
//
// We can't realistically drop `'unsafe-inline'` from script-src
// today (TanStack Start emits inline hydration scripts, Radix +
// shadcn inject styles dynamically). Removing it would require a
// build-time nonce/hash pipeline that's well out of scope for E39.
//
// What we CAN do: keep `'unsafe-inline'` AND add a `report-uri`
// directive that turns silent permissive behaviour into observable
// instrumentation. Every blocked OR allowed inline source produces
// a JSON report POST'd to this endpoint. Cloudflare Pages captures
// the console output, so an unexpected inline injection (e.g. a
// supply-chain compromise that appends a <script> tag) becomes
// visible in the Pages logs even though the browser still loads it.
//
// Per CSP Level 2/3 spec the endpoint must return 204 No Content
// regardless of payload validity — browsers will spam-retry on any
// other status. We do minimal logging (no PII, no payload bodies)
// to avoid creating a new ingestion surface.

interface Env {
  CSP_REPORT_LOGGING?: string;
}

interface CspReport {
  "csp-report"?: {
    "blocked-uri"?: string;
    "violated-directive"?: string;
    "document-uri"?: string;
    "source-file"?: string;
    "line-number"?: number;
    referrer?: string;
  };
}

function safeString(value: unknown, max = 200): string {
  if (typeof value !== "string") return "";
  return value.slice(0, max).replace(/[\r\n\t]/g, " ");
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // Always respond 204 — browsers don't expect a body and treat
  // anything else as a retry signal.
  const respond = () =>
    new Response(null, { status: 204, headers: { "cache-control": "no-store" } });

  if (env.CSP_REPORT_LOGGING !== "1") {
    // Default off so the endpoint is a no-op in environments where
    // log noise outweighs signal. Set CSP_REPORT_LOGGING=1 in the
    // CF Pages env to surface violations to the Pages console.
    return respond();
  }

  let body: CspReport;
  try {
    body = (await request.json()) as CspReport;
  } catch {
    return respond();
  }

  const r = body["csp-report"] ?? {};
  // Compact one-line log; no payload echoes, no PII fields. Sized
  // small to keep CF Pages log free of payload-exfil potential.
  console.warn(
    `[csp] directive="${safeString(r["violated-directive"])}" ` +
      `blocked="${safeString(r["blocked-uri"])}" ` +
      `source="${safeString(r["source-file"])}:${r["line-number"] ?? "?"}" ` +
      `document="${safeString(r["document-uri"])}"`,
  );

  return respond();
};
