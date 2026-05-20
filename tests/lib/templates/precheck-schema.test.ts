// E44.9 Phase B — zod schema + deterministic gate tests.
//
// Source of truth: tasks/E44-appendix-C.md § 2 (few-shot examples) and § 3
// (schema + derivePrecheckPassed). The few-shot JSON strings below are the
// VERBATIM outputs from the appendix — any drift here means the prompt and
// schema disagree, which is a launch-blocker.

import { describe, it, expect } from "vitest";

import {
  PrecheckResult,
  derivePrecheckPassed,
  stripRaw,
  toVerdict,
  type PrecheckEnvelope,
} from "@/lib/templates/precheckSchema";

const CLEAN_OUTPUT =
  '{"safety":{"score":0.0,"categories":[]},"profanity":{"score":0.0,"terms":[]},"age_rating":"all","copyright_red_flags":[],"summary":"Educational password-hygiene template, no concerns. Safe to publish."}';

const PROFANITY_OUTPUT =
  '{"safety":{"score":0.4,"categories":["harassment"]},"profanity":{"score":0.85,"terms":["debil","jebnúť","hovno","piča"]},"age_rating":"18+","copyright_red_flags":[],"summary":"Sustained Slovak profanity and reader-directed slurs. Reject unless author rewrites in neutral tone."}';

const COPYRIGHT_OUTPUT =
  '{"safety":{"score":0.1,"categories":[]},"profanity":{"score":0.0,"terms":[]},"age_rating":"all","copyright_red_flags":["Oficiálny Microsoft Security kvíz","official Microsoft Security Bulletin","Microsoft Corporation, all rights reserved","ISO/IEC 27001:2022 clause 5.1"],"summary":"Brand impersonation (claims official Microsoft origin) plus verbatim ISO/IEC 27001 standard text. Reject; author must rewrite in own words and drop the official-source framing."}';

describe("PrecheckResult.safeParse — accepts few-shot OUTPUTS from Appendix C § 2", () => {
  it.each([
    ["CLEAN", CLEAN_OUTPUT],
    ["PROFANITY", PROFANITY_OUTPUT],
    ["COPYRIGHT", COPYRIGHT_OUTPUT],
  ])("parses %s few-shot example", (_label, jsonString) => {
    const parsed = PrecheckResult.safeParse(JSON.parse(jsonString));
    expect(parsed.success).toBe(true);
  });
});

describe("PrecheckResult.safeParse — rejects invalid shapes", () => {
  const baseValid = {
    safety: { score: 0.1, categories: [] },
    profanity: { score: 0.0, terms: [] },
    age_rating: "all",
    copyright_red_flags: [],
    summary: "ok",
  };

  it("rejects negative safety score", () => {
    const bad = { ...baseValid, safety: { score: -0.1, categories: [] } };
    expect(PrecheckResult.safeParse(bad).success).toBe(false);
  });

  it("rejects safety score > 1", () => {
    const bad = { ...baseValid, safety: { score: 1.5, categories: [] } };
    expect(PrecheckResult.safeParse(bad).success).toBe(false);
  });

  it("rejects negative profanity score", () => {
    const bad = { ...baseValid, profanity: { score: -0.1, terms: [] } };
    expect(PrecheckResult.safeParse(bad).success).toBe(false);
  });

  it("rejects profanity score > 1", () => {
    const bad = { ...baseValid, profanity: { score: 1.5, terms: [] } };
    expect(PrecheckResult.safeParse(bad).success).toBe(false);
  });

  it("rejects missing summary", () => {
    const { summary: _drop, ...withoutSummary } = baseValid;
    expect(PrecheckResult.safeParse(withoutSummary).success).toBe(false);
  });

  it("rejects summary longer than 400 chars", () => {
    const bad = { ...baseValid, summary: "x".repeat(401) };
    expect(PrecheckResult.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown age_rating", () => {
    const bad = { ...baseValid, age_rating: "twelve_plus" };
    expect(PrecheckResult.safeParse(bad).success).toBe(false);
  });
});

describe("derivePrecheckPassed — boundary table", () => {
  function base(): PrecheckResult {
    return {
      safety: { score: 0, categories: [] },
      profanity: { score: 0, terms: [] },
      age_rating: "all",
      copyright_red_flags: [],
      summary: "ok",
    };
  }

  // Safety boundary: gate is `>= 0.30`, so 0.29 passes, 0.30 fails.
  it.each([
    [0.29, true],
    [0.3, false],
  ])("safety.score=%s → passed=%s", (score, expected) => {
    const r = { ...base(), safety: { score, categories: [] } };
    expect(derivePrecheckPassed(r)).toBe(expected);
  });

  // Profanity boundary: gate is `>= 0.50`, so 0.49 passes, 0.50 fails.
  it.each([
    [0.49, true],
    [0.5, false],
  ])("profanity.score=%s → passed=%s", (score, expected) => {
    const r = { ...base(), profanity: { score, terms: [] } };
    expect(derivePrecheckPassed(r)).toBe(expected);
  });

  it("empty copyright_red_flags → pass", () => {
    expect(derivePrecheckPassed(base())).toBe(true);
  });

  it("one copyright_red_flag entry → fail", () => {
    const r = { ...base(), copyright_red_flags: ["Microsoft Corporation"] };
    expect(derivePrecheckPassed(r)).toBe(false);
  });

  it.each([
    ["all", true],
    ["13+", true],
    ["16+", true],
    ["18+", false],
  ] as const)("age_rating=%s → passed=%s", (age_rating, expected) => {
    const r = { ...base(), age_rating };
    expect(derivePrecheckPassed(r)).toBe(expected);
  });

  it("prompt_injection category fails even with clean scores", () => {
    const r = {
      ...base(),
      safety: { score: 0, categories: ["prompt_injection" as const] },
    };
    expect(derivePrecheckPassed(r)).toBe(false);
  });
});

describe("stripRaw + toVerdict", () => {
  function makeEnvelope(): PrecheckEnvelope {
    return {
      precheck_passed: true,
      result: {
        safety: { score: 0.1, categories: [] },
        profanity: { score: 0, terms: [] },
        age_rating: "13+",
        copyright_red_flags: [],
        summary: "Looks fine.",
      },
      raw_response: '{"safety":{"score":0.1,"categories":[]}}',
      model_id: "claude-haiku-4-5-20251001",
      tokens_in: 1234,
      tokens_out: 56,
      cost_usd: 0.0042,
      latency_ms: 987,
      attempt: 1,
    };
  }

  it("stripRaw drops raw_response and preserves every other field", () => {
    const env = makeEnvelope();
    const stripped = stripRaw(env);
    expect(stripped).not.toHaveProperty("raw_response");
    expect(stripped.precheck_passed).toBe(env.precheck_passed);
    expect(stripped.result).toEqual(env.result);
    expect(stripped.model_id).toBe(env.model_id);
    expect(stripped.tokens_in).toBe(env.tokens_in);
    expect(stripped.tokens_out).toBe(env.tokens_out);
    expect(stripped.cost_usd).toBe(env.cost_usd);
    expect(stripped.latency_ms).toBe(env.latency_ms);
    expect(stripped.attempt).toBe(env.attempt);
  });

  it("toVerdict shape: precheck_passed, age_rating, summary, held_for_admin_review", () => {
    const env = makeEnvelope();
    const verdict = toVerdict(env);
    expect(verdict).toEqual({
      precheck_passed: true,
      age_rating: "13+",
      summary: "Looks fine.",
      held_for_admin_review: false,
    });
  });

  it("toVerdict.held_for_admin_review === !precheck_passed", () => {
    const env = { ...makeEnvelope(), precheck_passed: false };
    expect(toVerdict(env).held_for_admin_review).toBe(true);
  });
});
