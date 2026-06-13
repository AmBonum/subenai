import { describe, expect, it } from "vitest";

import { extractResponseText, parseOnTopic } from "../../functions/_lib/scam-chat/gates";

// The exact raw object Workers AI returned in production for the input-gate
// call (captured via scripts/diagnose-gate.ts). `response` is the PARSED
// JSON object; the string lives in choices[0].message.content. The original
// extractor only handled a string `response`, so it returned "" and every
// gate failed closed as off_topic.
const PROD_GATE_RESULT = {
  choices: [
    {
      finish_reason: "stop",
      index: 0,
      message: { content: '{"on_topic": true}', role: "assistant" },
    },
  ],
  model: "@cf/meta/llama-3.1-8b-fast-v2",
  object: "chat.completion",
  response: { on_topic: true },
  usage: { prompt_tokens: 178, completion_tokens: 7, total_tokens: 185 },
};

describe("extractResponseText", () => {
  it("reads choices[0].message.content from the OpenAI-compatible shape", () => {
    expect(extractResponseText(PROD_GATE_RESULT)).toBe('{"on_topic": true}');
  });

  it("still reads the legacy { response: '<text>' } string shape", () => {
    expect(extractResponseText({ response: "safe" })).toBe("safe");
  });

  it("stringifies an object `response` when no choices are present", () => {
    expect(extractResponseText({ response: { on_topic: false } })).toBe('{"on_topic":false}');
  });

  it("passes a bare string through", () => {
    expect(extractResponseText("safe")).toBe("safe");
  });

  it("returns '' for an unrecognized shape", () => {
    expect(extractResponseText({ foo: "bar" })).toBe("");
    expect(extractResponseText(null)).toBe("");
  });
});

describe("parseOnTopic", () => {
  it("returns true for the real production gate result (regression)", () => {
    expect(parseOnTopic(PROD_GATE_RESULT)).toBe(true);
  });

  it("returns false when the model classifies off-topic", () => {
    expect(
      parseOnTopic({
        choices: [{ message: { content: '{"on_topic": false}' } }],
        response: { on_topic: false },
      }),
    ).toBe(false);
  });

  it("returns null for unparseable output (fails closed upstream)", () => {
    expect(parseOnTopic({ choices: [{ message: { content: "no json here" } }] })).toBeNull();
  });
});
