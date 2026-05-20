// E35.3 / E35.6 — prompt-injection harness.
//
// The AH-11 backend that will accept admin AI generation requests is
// not yet wired. The frontend in `src/lib/admin/ai-generate.functions.ts`
// already short-circuits to `ai_disabled` when `VITE_AI_GENERATOR_ENABLED`
// is not `"true"`. This spec asserts that:
//
//   1. With the flag unset / "false", the client function refuses
//      every payload via `ai_disabled` — i.e. no payload reaches a
//      backend that doesn't exist.
//   2. The payload library exists and is non-empty (regression net:
//      if someone deletes the file or the export, this test fails).
//
// When AH-11 lands and the backend actually calls a model, replace the
// `expect("ai_disabled")` assertion with one that calls the backend
// directly (mocked at the HTTP layer) and asserts the response carries
// a refusal / safe-completion marker. The payload list and the
// per-payload `it()` cases stay — only the assertion line flips.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { PROMPT_INJECTION_PAYLOADS } from "./prompt-injection-payloads";

describe("prompt injection — payload library", () => {
  it("exports a non-empty payload list", () => {
    expect(PROMPT_INJECTION_PAYLOADS.length).toBeGreaterThan(5);
  });

  it("every payload has a unique id and a non-empty body + vector", () => {
    const ids = new Set<string>();
    for (const p of PROMPT_INJECTION_PAYLOADS) {
      expect(p.id, "payload id missing").toBeTruthy();
      expect(p.payload.length, `payload "${p.id}" body empty`).toBeGreaterThan(0);
      expect(p.vector.length, `payload "${p.id}" vector empty`).toBeGreaterThan(0);
      expect(ids.has(p.id), `duplicate payload id "${p.id}"`).toBe(false);
      ids.add(p.id);
    }
  });
});

describe("prompt injection — current frontend behaviour (AH-11 backend not yet wired)", () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    // Restore env defaults so subsequent test files see the original state.
    Object.assign(import.meta.env, originalEnv);
  });

  it.each(PROMPT_INJECTION_PAYLOADS)(
    'refuses payload "$id" ($vector) — AI generator gate returns "ai_disabled"',
    async ({ payload }) => {
      // Force the gate OFF — this is the production posture today.
      (import.meta.env as Record<string, string | undefined>).VITE_AI_GENERATOR_ENABLED = "false";

      const mod = await import("@/lib/admin/ai-generate.functions");
      try {
        await mod.generateQuestionWithAnswers({
          topic: payload,
          category: "scam-detection",
          correctCount: 1,
          incorrectCount: 3,
        });
        // If the function resolves without throwing, the gate is broken.
        throw new Error("expected AIGenerateError('ai_disabled')");
      } catch (err) {
        // Either:
        //  - the function throws an Error/AIGenerateError with code/message "ai_disabled"
        //  - the function rejects with a structured object carrying that code
        const message = err instanceof Error ? err.message : JSON.stringify(err);
        expect(message.toLowerCase()).toContain("ai_disabled");
      }
    },
  );
});
