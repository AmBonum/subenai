import { describe, it, expect, vi, beforeEach } from "vitest";

import { sendEmail, isPlausibleEmail, type EmailEnv } from "../../functions/_lib/email";
import { CONTACT_EMAIL } from "@/config/site";

const env: EmailEnv = {
  RESEND_API_KEY: "re_test_key",
  EMAIL_FROM: "subenai <noreply@subenai.sk>",
  EMAIL_REPLY_TO: CONTACT_EMAIL,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("sendEmail", () => {
  it("POSTs to the Resend endpoint with the configured headers and body", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "evt_resend_123" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const result = await sendEmail(env, {
      to: "user@example.test",
      subject: "Test",
      html: "<p>Hi</p>",
      text: "Hi",
      idempotencyKey: "k-1",
    });

    expect(result).toEqual({ ok: true, id: "evt_resend_123" });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");

    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer re_test_key");
    expect(headers["Idempotency-Key"]).toBe("k-1");
    expect(headers["content-type"]).toBe("application/json");

    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({
      from: "subenai <noreply@subenai.sk>",
      to: ["user@example.test"],
      subject: "Test",
      html: "<p>Hi</p>",
      text: "Hi",
      reply_to: CONTACT_EMAIL,
    });
  });

  it("omits Idempotency-Key when not provided", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));

    await sendEmail(env, { to: "x@y.test", subject: "s", html: "h" });
    const headers = (fetchSpy.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers["Idempotency-Key"]).toBeUndefined();
  });

  it("returns ok:false when Resend rejects with non-2xx", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("validation error", { status: 422 }),
    );
    const result = await sendEmail(env, { to: "x@y.test", subject: "s", html: "h" });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("resend_422");
  });

  it("scrubs email-shaped substrings from the logged Resend error body", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response('{"message":"Invalid recipient jan.novak@example.sk rejected"}', {
        status: 422,
      }),
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await sendEmail(env, { to: "jan.novak@example.sk", subject: "s", html: "h" });
    const logged = errorSpy.mock.calls[0]?.[1] as { body: string };
    expect(logged.body).not.toContain("jan.novak@example.sk");
    expect(logged.body).toContain("[email]");
  });

  it("returns ok:false when fetch throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("network down"));
    const result = await sendEmail(env, { to: "x@y.test", subject: "s", html: "h" });
    expect(result).toEqual({ ok: false, error: "network_error" });
  });
});

describe("isPlausibleEmail", () => {
  it.each([
    ["anna@example.test", true],
    ["with+tag@example.com", true],
    ["", false],
    ["no-at-sign", false],
    ["double@@at.com", false],
    ["spaces in@email.com", false],
    [`${"x".repeat(250)}@y.com`, false],
  ])("%s → %s", (input, expected) => {
    expect(isPlausibleEmail(input)).toBe(expected);
  });
});
