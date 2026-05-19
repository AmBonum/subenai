import { nextId, pad } from "./counters";

export type TrainingRow = {
  id: string;
  title: string;
  description: string | null;
  topic_slug: string | null;
  status: "published" | "draft" | "archived";
  content: unknown | null;
  slug: string | null;
  estimated_minutes: number | null;
  created_at: string;
};

export function seedTraining(overrides: Partial<TrainingRow> = {}): TrainingRow {
  const n = nextId("training");
  return {
    id: `tr_e2e_${pad(n)}`,
    title: `E2E Training ${n}`,
    description: `Description for training ${n}`,
    topic_slug: "vseobecne",
    status: "published",
    content: null,
    slug: `e2e-training-${n}`,
    estimated_minutes: null,
    created_at: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}
