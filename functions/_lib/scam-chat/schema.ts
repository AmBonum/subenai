// E53.2 — request schema, payload caps and history sanitization for the
// scam-chat gateway. Caps per plan §Security layer 1: message ≤ 2,000
// chars, history ≤ 12 turns / ≤ 12,000 chars. Shape errors → 422,
// over-cap payloads → 413 (mapped in functions/api/scam-chat/index.ts).

import { z } from "zod";

export const MAX_MESSAGE_CHARS = 2_000;
export const MAX_HISTORY_TURNS = 12;
export const MAX_HISTORY_CHARS = 12_000;

const historyItemSchema = z.object({
  role: z.string(),
  content: z.string(),
});

export const scamChatRequestSchema = z.object({
  message: z.string().min(1),
  history: z.array(historyItemSchema).default([]),
  turnstile_token: z.string().optional(),
  // E53.4 — when the user clicks "Preveriť podozrenie" the client forces
  // triage mode; otherwise the input gate may classify a triage opener.
  mode: z.enum(["chat", "triage"]).optional(),
  // E53.5 — structured photo findings the client attaches to the turn so
  // the assessment can reference image evidence without re-uploading bytes.
  photo_findings: z.array(z.string()).max(5).optional(),
});

export type ScamChatRequest = z.infer<typeof scamChatRequestSchema>;
export type HistoryItem = z.infer<typeof historyItemSchema>;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export type CapViolation = "message_too_long" | "history_too_many_turns" | "history_too_long";

export function findCapViolation(req: ScamChatRequest): CapViolation | null {
  if (req.message.length > MAX_MESSAGE_CHARS) return "message_too_long";
  if (req.history.length > MAX_HISTORY_TURNS) return "history_too_many_turns";
  const totalChars = req.history.reduce((sum, item) => sum + item.content.length, 0);
  if (totalChars > MAX_HISTORY_CHARS) return "history_too_long";
  return null;
}

// Plan §Security layer 6: any system/tool roles smuggled into the
// client-supplied history are stripped, and roles are forced to
// user/assistant alternation (the first message of a same-role run wins).
export function sanitizeHistory(history: HistoryItem[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const item of history) {
    if (item.role !== "user" && item.role !== "assistant") continue;
    const content = item.content.trim();
    if (!content) continue;
    const prev = turns[turns.length - 1];
    if (prev && prev.role === item.role) continue;
    turns.push({ role: item.role, content });
  }
  return turns.slice(-MAX_HISTORY_TURNS);
}

export interface TriageAssessment {
  risk: "low" | "medium" | "high";
  indicators: string[];
  timeline: string[];
  evidence: string[];
  next_steps: string[];
}

export interface ScamChatResponseBody {
  ok: true;
  reply: string;
  citations: string[];
  refusal: "off_topic" | "unsafe" | null;
  degraded: boolean;
  // E53.4 — present only on triage turns that parsed into structured JSON.
  // null when triage was requested but the model returned only prose
  // (graceful text-only fallback — `reply` still carries the answer).
  triage?: TriageAssessment | null;
}
