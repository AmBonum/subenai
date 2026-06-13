// E53.3 — client transport for the scam-chat gateway. History is bounded
// to the gateway's 12-turn contract before sending; the JWT (when signed
// in) rides as a Bearer header so the server can widen retrieval to the
// `app` audience. History lives ONLY in React state — this module never
// touches local/sessionStorage.

import { supabase } from "@/integrations/supabase/client";

export const MAX_CLIENT_HISTORY_TURNS = 12;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface TriageAssessment {
  risk: "low" | "medium" | "high";
  indicators: string[];
  timeline: string[];
  evidence: string[];
  next_steps: string[];
}

export interface ChatReply {
  reply: string;
  citations: string[];
  refusal: "off_topic" | "unsafe" | null;
  degraded: boolean;
  triage?: TriageAssessment | null;
}

export type SendChatResult =
  | { kind: "ok"; data: ChatReply }
  | { kind: "quota" }
  | { kind: "error" };

async function authHeader(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export interface SendChatArgs {
  message: string;
  history: ChatTurn[];
  turnstileToken?: string | null;
  mode?: "chat" | "triage";
  photoFindings?: string[];
}

export async function sendChatMessage(args: SendChatArgs): Promise<SendChatResult> {
  const history = args.history.slice(-MAX_CLIENT_HISTORY_TURNS);
  let res: Response;
  try {
    res = await fetch("/api/scam-chat", {
      method: "POST",
      headers: { "content-type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({
        message: args.message,
        history,
        turnstile_token: args.turnstileToken ?? undefined,
        mode: args.mode,
        photo_findings: args.photoFindings,
      }),
    });
  } catch {
    return { kind: "error" };
  }
  if (res.status === 429) return { kind: "quota" };
  if (!res.ok) return { kind: "error" };
  try {
    const data = (await res.json()) as ChatReply;
    return { kind: "ok", data };
  } catch {
    return { kind: "error" };
  }
}

export type UploadPhotoResult =
  | {
      kind: "ok";
      findings: string | null;
      analyzed: boolean;
      degraded: boolean;
      notice: string | null;
    }
  | { kind: "quota" }
  | { kind: "error" };

export async function uploadPhoto(blob: Blob, index: number): Promise<UploadPhotoResult> {
  const form = new FormData();
  form.append("file", blob, `evidence-${index}.jpg`);
  form.append("index", String(index));
  let res: Response;
  try {
    res = await fetch("/api/scam-chat/photo", {
      method: "POST",
      headers: { ...(await authHeader()) },
      body: form,
    });
  } catch {
    return { kind: "error" };
  }
  if (res.status === 429) return { kind: "quota" };
  if (!res.ok) return { kind: "error" };
  try {
    const data = (await res.json()) as {
      findings: string | null;
      analyzed: boolean;
      degraded: boolean;
      notice: string | null;
    };
    return { kind: "ok", ...data };
  } catch {
    return { kind: "error" };
  }
}
