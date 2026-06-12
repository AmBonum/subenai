// Mid-take resume for the anonymous respondent flow (/t/$shareId).
//
// A page refresh used to drop every useState in TakeTestFlow — the
// respondent lost their progress AND the already-started session row
// stayed `in_progress` forever (ghost session). Persisting the minimal
// session snapshot lets a reload resume the SAME session: re-submits are
// safe because submit_respondent_answer upserts on (session_id,
// question_id), and finalize still fires exactly once at the end.
//
// sessionStorage on purpose — it dies with the tab, so respondent PII in
// `intake` never outlives the browsing session. Do NOT switch to
// localStorage (respondent privacy decision).

export interface SavedRespondentAnswer {
  question_id: string;
  value: string;
  is_correct: boolean | null;
  time_ms: number;
}

export interface SavedRespondentSession {
  sessionId: string;
  sessionToken: string | null;
  intake: Record<string, string>;
  answers: SavedRespondentAnswer[];
  qIdx: number;
  questionOrder: string[];
}

const STORAGE_PREFIX = "iiq_respondent_session_v1";

export function respondentSessionKey(shareId: string): string {
  return `${STORAGE_PREFIX}:${shareId}`;
}

export function loadRespondentSession(shareId: string): SavedRespondentSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(respondentSessionKey(shareId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedRespondentSession;
    if (
      typeof parsed.sessionId !== "string" ||
      parsed.sessionId.length === 0 ||
      !Array.isArray(parsed.answers) ||
      !Array.isArray(parsed.questionOrder) ||
      typeof parsed.qIdx !== "number" ||
      typeof parsed.intake !== "object" ||
      parsed.intake === null
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveRespondentSession(shareId: string, payload: SavedRespondentSession): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(respondentSessionKey(shareId), JSON.stringify(payload));
  } catch {
    // Storage unavailable (private mode, quota) — resume is best-effort.
  }
}

export function clearRespondentSession(shareId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(respondentSessionKey(shareId));
  } catch {
    // non-fatal
  }
}
