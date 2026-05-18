import { z } from "zod";

const InputSchema = z.object({
  topic: z.string().min(3).max(500),
  category: z.string().min(1).max(80),
  correctCount: z.number().int().min(1).max(6).default(3),
  incorrectCount: z.number().int().min(1).max(8).default(5),
});

const OutputSchema = z.object({
  title: z.string(),
  excerpt: z.string(),
  body: z.string(),
  correct_answers: z.array(z.object({ text: z.string(), explanation: z.string().optional() })),
  incorrect_answers: z.array(z.object({ text: z.string(), explanation: z.string().optional() })),
});

export type GeneratedQuestion = z.infer<typeof OutputSchema>;
export type GenerateInput = z.infer<typeof InputSchema>;

export type AIGenerateErrorCode = "ai_disabled" | "rate_limit" | "no_credits";

export class AIGenerateError extends Error {
  readonly code: AIGenerateErrorCode;
  constructor(code: AIGenerateErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = "AIGenerateError";
  }
}

// AH-4.1: feature-flagged off by default. Until VITE_AI_GENERATOR_ENABLED is
// flipped to "true" (a dedicated AI epic post-AH-4), this function short-
// circuits before reaching any remote service so the production bundle ships
// dark. AH-11 will replace the body with a real Cloudflare Pages function
// call (or createServerFn wrapper once subenai is fully TanStack Start).
export async function generateQuestionWithAnswers(
  input: GenerateInput,
): Promise<GeneratedQuestion> {
  if (import.meta.env.VITE_AI_GENERATOR_ENABLED !== "true") {
    throw new AIGenerateError("ai_disabled");
  }

  const data = InputSchema.parse(input);

  const res = await fetch("/api/admin/ai-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (res.status === 429) throw new AIGenerateError("rate_limit");
  if (res.status === 402) throw new AIGenerateError("no_credits");
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`AI Gateway zlyhala (${res.status}): ${text.slice(0, 200)}`);
  }

  const payload = (await res.json()) as unknown;
  return OutputSchema.parse(payload);
}
