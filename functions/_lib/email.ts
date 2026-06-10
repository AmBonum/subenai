export interface EmailEnv {
  RESEND_API_KEY: string;
  EMAIL_FROM: string;
  EMAIL_REPLY_TO: string;
}

export interface EmailAttachment {
  filename: string;
  /** Base64-encoded file contents (no data: prefix). */
  content: string;
  /** Optional MIME hint — Resend infers from filename if omitted. */
  contentType?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
  /** Optional file attachments forwarded to Resend (E40.4). */
  attachments?: EmailAttachment[];
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export async function sendEmail(env: EmailEnv, input: SendEmailInput): Promise<SendEmailResult> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${env.RESEND_API_KEY}`,
  };
  if (input.idempotencyKey) {
    headers["Idempotency-Key"] = input.idempotencyKey;
  }

  const body = {
    from: env.EMAIL_FROM,
    to: [input.to],
    subject: input.subject,
    html: input.html,
    ...(input.text ? { text: input.text } : {}),
    reply_to: env.EMAIL_REPLY_TO,
    ...(input.attachments && input.attachments.length > 0
      ? {
          attachments: input.attachments.map((a) => ({
            filename: a.filename,
            content: a.content,
            ...(a.contentType ? { content_type: a.contentType } : {}),
          })),
        }
      : {}),
  };

  let response: Response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error("email.sendEmail network", {
      message: err instanceof Error ? err.message : "unknown",
    });
    return { ok: false, error: "network_error" };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    // Resend error bodies echo the recipient address — scrub anything
    // email-shaped before it lands in CF logs.
    const scrubbed = text.replace(/[^\s@"]+@[^\s@"]+/g, "[email]");
    console.error("email.sendEmail rejected", {
      status: response.status,
      body: scrubbed.slice(0, 200),
    });
    return { ok: false, error: `resend_${response.status}` };
  }

  const payload = (await response.json().catch(() => ({}))) as { id?: string };
  return { ok: true, id: payload.id };
}

export function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}
