import type { Page } from "@playwright/test";

/**
 * E53.9 — route-layer mocks for the scam-chat gateway. `npm run dev` is
 * plain vite and does NOT serve the Pages Functions, so the gateway's real
 * responses are canned here matching the response contract in
 * `src/lib/scam-chat/client.ts` (ChatReply / UploadPhotoResult). This is
 * the deterministic-CI path the plan mandates; the live gateway is covered
 * by the Vitest injection suite + an optional @live smoke.
 *
 * Same convention as the other `e2e/mocks/api/*` stubs: a `page.route`
 * installer per endpoint (route interception is environment, not an
 * element, so it lives here rather than in a POM).
 */

export interface ChatReplyStub {
  reply: string;
  citations?: string[];
  refusal?: "off_topic" | "unsafe" | null;
  degraded?: boolean;
  triage?: {
    risk: "low" | "medium" | "high";
    indicators: string[];
    timeline: string[];
    evidence: string[];
    next_steps: string[];
  } | null;
}

/** Fulfill POST /api/scam-chat with a 200 ChatReply body. */
export async function stubScamChatReply(page: Page, stub: ChatReplyStub): Promise<void> {
  await page.route("**/api/scam-chat", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reply: stub.reply,
        citations: stub.citations ?? [],
        refusal: stub.refusal ?? null,
        degraded: stub.degraded ?? false,
        triage: stub.triage ?? null,
      }),
    });
  });
}

/**
 * Fulfill POST /api/scam-chat with the fail-closed quota state. The body
 * mirrors `functions/_lib/scam-chat/budget.ts` FAIL_CLOSED_MESSAGE; the
 * client maps any 429 to its `quota` branch (status code is what matters).
 */
export async function stubScamChatQuota(page: Page): Promise<void> {
  await page.route("**/api/scam-chat", async (route) => {
    await route.fulfill({
      status: 429,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reply:
          "Asistent má dnes plno. Skúste to, prosím, zajtra — alebo si zatiaľ pozrite naše kurzy o podvodoch.",
        citations: [],
        refusal: null,
        degraded: false,
        triage: null,
      }),
    });
  });
}

export interface PhotoFindingsStub {
  findings: string | null;
  analyzed?: boolean;
  degraded?: boolean;
  notice?: string | null;
}

/** Fulfill POST /api/scam-chat/photo with a 200 findings body. */
export async function stubScamChatPhoto(page: Page, stub: PhotoFindingsStub): Promise<void> {
  await page.route("**/api/scam-chat/photo", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        findings: stub.findings,
        analyzed: stub.analyzed ?? true,
        degraded: stub.degraded ?? false,
        notice: stub.notice ?? null,
      }),
    });
  });
}
