// E45 Phase 1 — deterministic shuffle for random question order.
//
// Used by the respondent TakeTestFlow when a test has
// `question_order_mode = 'random'`. The shuffle is keyed by the session's
// UUID (string), so:
//
//   * the SAME respondent reloading the take page sees the SAME order
//     within their session (R2 mitigation — D2 in PLAN-2026-05-21-E45);
//   * DIFFERENT respondents see DIFFERENT orders (anti-cheat against
//     screenshot-sharing the question sequence);
//   * the server is stateless about UI order — session_answers persist
//     by question_id, never by position, so scoring is identical.
//
// Implementation is three tiny primitives chained together, deliberately
// pure and dependency-free so the algorithm survives bundling / SSR /
// jsdom alike:
//
//   1. fnv1a32(str)          — hash UTF-16 codepoints to a 32-bit int
//   2. mulberry32(seed)      — 32-bit PRNG returning [0, 1)
//   3. fisherYates(arr, rng) — in-place shuffle using the PRNG
//
// Why FNV-1a + Mulberry32: both are tiny, fast, well-understood, and
// produce visually uniform shuffles. We do NOT need cryptographic
// security here — the seed is the session.id and the worst-case
// adversary is a respondent trying to predict the next question. They
// already know their own session.id (it's in the cookie), but knowing
// the algorithm only lets them precompute their own order, which is
// useless: the answers they submit must reference question_ids, not
// positions, and a question in position 1 vs position 5 is the same
// question.

/** FNV-1a 32-bit hash. Pure, deterministic, ~5 LOC. */
export function fnv1a32(input: string): number {
  let hash = 0x811c9dc5; // FNV offset basis (32-bit)
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // FNV prime multiply, kept as 32-bit unsigned via `>>> 0`.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Mulberry32 PRNG — returns a function that yields uniform [0, 1). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shuffle the items array deterministically using the given session id
 * as the seed. Returns a NEW array — does not mutate the input.
 *
 * Empty input → empty output. Single-element input → single-element
 * output (Fisher-Yates is a no-op).
 */
export function shuffleBySessionId<T>(items: readonly T[], sessionId: string): T[] {
  const out = items.slice();
  if (out.length <= 1) return out;
  const rng = mulberry32(fnv1a32(sessionId));
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    if (j !== i) {
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
  }
  return out;
}

/**
 * Resolve the order in which a respondent should see a test's questions.
 * Pure helper used by TakeTestFlow on stage-transition (intake → questions).
 *
 * `mode === "fixed"`  → returns the array as-is (DB order, set by author).
 * `mode === "random"` → returns a deterministic Fisher-Yates shuffle
 *                       seeded by sessionId. If sessionId is empty (e.g.
 *                       pre-intake render), returns the array as-is to
 *                       avoid leaking a pre-session order; the caller
 *                       must invoke us AGAIN after session start.
 */
export function resolveQuestionOrder(
  questionIds: readonly string[],
  mode: "fixed" | "random",
  sessionId: string | null,
): string[] {
  if (mode === "fixed" || !sessionId) return questionIds.slice();
  return shuffleBySessionId(questionIds, sessionId);
}
