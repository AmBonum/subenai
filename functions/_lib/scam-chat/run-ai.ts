// E53.2 — the single Workers AI wrapper. EVERY model call in the
// scam-chat pipeline flows through createAiRunner() so the E53.7 neuron
// ledger sees all spend. Estimates derive from the plan's §Cost table.

import type { NeuronLedger } from "./budget";

// Minimal local binding type — functions/** is outside the root tsconfig
// project, and the tests that import these modules typecheck without
// @cloudflare/workers-types.
export interface AiBinding {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}

export type AiPurpose =
  | "gate_topic_input"
  | "gate_guard"
  | "gate_topic_output"
  | "embed"
  | "generate_main"
  | "generate_degraded";

export const NEURON_ESTIMATES: Record<AiPurpose, number> = {
  gate_topic_input: 20,
  gate_guard: 25,
  gate_topic_output: 10,
  embed: 1,
  generate_main: 140,
  generate_degraded: 45,
};

export type AiRunner = (
  purpose: AiPurpose,
  model: string,
  inputs: Record<string, unknown>,
) => Promise<unknown>;

export function createAiRunner(ai: AiBinding, ledger: NeuronLedger): AiRunner {
  return async (purpose, model, inputs) => {
    try {
      return await ai.run(model, inputs);
    } finally {
      // Record in finally — spend happened even if the call threw mid-way.
      await ledger.record(NEURON_ESTIMATES[purpose]);
    }
  };
}
