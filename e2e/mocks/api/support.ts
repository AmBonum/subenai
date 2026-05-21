import type { BrowserContext, Request, Route } from "@playwright/test";

/**
 * Mocks for the two E48 CF functions: `/api/support-ticket-create` and
 * `/api/support-ticket-reply`. Routes are registered on the context so
 * every page in the spec sees the same stub set.
 *
 * Why context-level (not page-level) routes:
 *   The smoke test spans multiple navigations (kontakt -> view -> admin
 *   queue -> detail), and Playwright's `page.route` registrations don't
 *   survive `page.goto` to a different origin. `context.route` persists
 *   for the lifetime of the BrowserContext, which is exactly the test.
 *
 * Capture API:
 *   Each handler stashes the captured POST body in the returned
 *   `Captured` object. Specs can then assert on what would have been
 *   sent to Resend, what the admin reply payload was, etc. without
 *   reaching for global state.
 */

export interface CapturedRequest {
  url: string;
  method: string;
  body: unknown;
  headers: Record<string, string>;
}

export interface MockSupportApiOptions {
  /**
   * Override the default success response for `/api/support-ticket-create`.
   * The default emits a 64-hex view_token + a stable ticket_id.
   */
  ticketCreateResponse?: { ticket_id: string; view_token: string };
  /**
   * Force the create endpoint into a failure mode. Spec uses this to
   * exercise the form's error display.
   */
  ticketCreateError?: { status: number; error: string };
  /**
   * Override the reply endpoint response.
   */
  ticketReplyResponse?: { message_id: string };
  /**
   * Force the reply endpoint into a failure mode.
   */
  ticketReplyError?: { status: number; error: string };
}

export interface MockSupportApiCaptures {
  ticketCreateRequests: CapturedRequest[];
  ticketReplyRequests: CapturedRequest[];
}

const DEFAULT_TICKET_ID = "11111111-1111-4111-8111-111111111111";
const DEFAULT_VIEW_TOKEN = "a".repeat(64);

function jsonResponse(status: number, body: unknown) {
  return {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    } as Record<string, string>,
    body: JSON.stringify(body),
  };
}

function captureRequest(request: Request): CapturedRequest {
  let body: unknown = null;
  const raw = request.postData();
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = raw;
    }
  }
  return {
    url: request.url(),
    method: request.method(),
    body,
    headers: request.headers(),
  };
}

export async function mockSupportApi(
  context: BrowserContext,
  options: MockSupportApiOptions = {},
): Promise<MockSupportApiCaptures> {
  const captures: MockSupportApiCaptures = {
    ticketCreateRequests: [],
    ticketReplyRequests: [],
  };

  await context.route("**/api/support-ticket-create", async (route: Route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    captures.ticketCreateRequests.push(captureRequest(route.request()));

    if (options.ticketCreateError) {
      await route.fulfill(
        jsonResponse(options.ticketCreateError.status, {
          error: options.ticketCreateError.error,
        }),
      );
      return;
    }

    const resp = options.ticketCreateResponse ?? {
      ticket_id: DEFAULT_TICKET_ID,
      view_token: DEFAULT_VIEW_TOKEN,
    };
    await route.fulfill(jsonResponse(200, { ok: true, ...resp }));
  });

  await context.route("**/api/support-ticket-reply", async (route: Route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    captures.ticketReplyRequests.push(captureRequest(route.request()));

    if (options.ticketReplyError) {
      await route.fulfill(
        jsonResponse(options.ticketReplyError.status, {
          error: options.ticketReplyError.error,
        }),
      );
      return;
    }

    const resp = options.ticketReplyResponse ?? { message_id: "msg-001" };
    await route.fulfill(jsonResponse(200, { ok: true, ...resp }));
  });

  return captures;
}
