// E53.4 — triage structured output: schema parse, retry-once on malformed
// JSON, graceful text-only fallback, gateway triage routing.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { onRequestPost } from "../../functions/api/scam-chat/index";
import {
  isTriageOpener,
  parseTriageJson,
  POLICE_RECOMMENDATION,
  runTriage,
} from "../../functions/_lib/scam-chat/triage";
import { __test__ as security__test__ } from "../../functions/_lib/security";
import type { TriageAssessment } from "../../functions/_lib/scam-chat/schema";
import { baseEnv, buildRequest, makeAi, MAIN_MODEL } from "./scam-chat-helpers";

const { getUserMock, createClientMock } = vi.hoisted(() => {
  const getUserMock = vi.fn();
  return { getUserMock, createClientMock: vi.fn(() => ({ auth: { getUser: getUserMock } })) };
});
vi.mock("@supabase/supabase-js", () => ({ createClient: createClientMock }));

beforeEach(() => {
  security__test__.resetAll();
  getUserMock.mockReset();
  getUserMock.mockResolvedValue({ data: { user: null }, error: { message: "no" } });
});
afterEach(() => vi.restoreAllMocks());

const VALID_TRIAGE = {
  risk: "high",
  indicators: ["Žiadosť o úhradu vopred", "Tlak na rýchle rozhodnutie"],
  timeline: ["10:00 prišla SMS", "10:05 výzva na platbu"],
  evidence: ["SMS od neznámeho čísla"],
  next_steps: ["Neplaťte", "Kontaktujte banku"],
  summary: "Toto vyzerá ako podvod.",
};

describe("parseTriageJson", () => {
  it("parses a well-formed triage object", () => {
    const parsed = parseTriageJson({ response: JSON.stringify(VALID_TRIAGE) });
    expect(parsed?.risk).toBe("high");
    expect(parsed?.indicators).toHaveLength(2);
  });

  it("extracts JSON embedded in surrounding prose", () => {
    const parsed = parseTriageJson({
      response: `Tu je posúdenie: ${JSON.stringify(VALID_TRIAGE)} dúfam že pomôže`,
    });
    expect(parsed?.risk).toBe("high");
  });

  it("returns null on malformed JSON", () => {
    expect(parseTriageJson({ response: "{ risk: high, no quotes }" })).toBeNull();
  });

  it("returns null when required fields are missing / invalid", () => {
    expect(parseTriageJson({ response: JSON.stringify({ risk: "catastrophic" }) })).toBeNull();
  });
});

describe("isTriageOpener", () => {
  it("matches first-person victim phrasing", () => {
    expect(isTriageOpener("Myslím že bol som podvedený cez internet")).toBe(true);
    expect(isTriageOpener("podviedli ma na bazoši")).toBe(true);
  });

  it("does NOT match a generic on-topic question", () => {
    expect(isTriageOpener("Je toto podvod?")).toBe(false);
    expect(isTriageOpener("Ako spoznám phishing?")).toBe(false);
  });
});

describe("runTriage retry + fallback", () => {
  function recorder(replies: string[]) {
    const calls: string[] = [];
    let i = 0;
    const runAi = (async (_purpose: string, model: string) => {
      calls.push(model);
      return { response: replies[Math.min(i++, replies.length - 1)] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    return { runAi, calls };
  }

  it("parses on the first attempt (no retry)", async () => {
    const { runAi, calls } = recorder([JSON.stringify(VALID_TRIAGE)]);
    const out = await runTriage(runAi, MAIN_MODEL, "generate_main", []);
    expect(out.assessment?.risk).toBe("high");
    expect(calls).toHaveLength(1);
    expect(out.reply).toContain("Toto vyzerá ako podvod.");
    // high risk → police line appended
    expect(out.reply).toContain("158");
  });

  it("retries once when the first attempt is malformed", async () => {
    const { runAi, calls } = recorder(["not json", JSON.stringify(VALID_TRIAGE)]);
    const out = await runTriage(runAi, MAIN_MODEL, "generate_main", []);
    expect(calls).toHaveLength(2);
    expect(out.assessment?.risk).toBe("high");
  });

  it("falls back to text-only after two malformed attempts", async () => {
    const { runAi, calls } = recorder(["Toto je podozrivé, buďte opatrní.", "stále žiadny JSON"]);
    const out = await runTriage(runAi, MAIN_MODEL, "generate_main", []);
    expect(calls).toHaveLength(2);
    expect(out.assessment).toBeNull();
    expect(out.reply).toBe("stále žiadny JSON");
  });
});

describe("gateway triage mode", () => {
  it("mode:'triage' returns a structured assessment", async () => {
    const env = baseEnv({ AI: makeAi({ reply: JSON.stringify(VALID_TRIAGE) }) });
    const res = await onRequestPost({
      request: buildRequest({ message: "Opisujem situáciu", mode: "triage" }),
      env,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { triage: TriageAssessment | null; reply: string };
    expect(body.triage?.risk).toBe("high");
    expect(body.reply).toContain(POLICE_RECOMMENDATION.slice(0, 20));
  });

  it("malformed triage JSON twice → text-only (triage null), still 200", async () => {
    const env = baseEnv({ AI: makeAi({ reply: "Znie to ako podvod, dajte si pozor." }) });
    const res = await onRequestPost({
      request: buildRequest({ message: "Opisujem situáciu", mode: "triage" }),
      env,
    });
    const body = (await res.json()) as { triage: TriageAssessment | null; reply: string };
    expect(body.triage).toBeNull();
    expect(body.reply.length).toBeGreaterThan(0);
  });

  it("photo_findings fold into the user turn sent to the model", async () => {
    const ai = makeAi({ reply: JSON.stringify(VALID_TRIAGE) });
    const env = baseEnv({ AI: ai });
    await onRequestPost({
      request: buildRequest({
        message: "Toto mi prišlo",
        mode: "triage",
        photo_findings: ["SMS s odkazom na falošnú banku"],
      }),
      env,
    });
    const generationCall = ai.calls.find((c) => c.model === MAIN_MODEL);
    expect(JSON.stringify(generationCall?.inputs)).toContain("SMS s odkazom na falošnú banku");
  });
});
