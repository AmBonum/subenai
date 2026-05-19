import type { Database } from "../../src/integrations/supabase/types";
import { nextId, pad } from "./counters";

export type CategoryRow = Database["public"]["Tables"]["categories"]["Row"];
export type TopicRow = Database["public"]["Tables"]["topics"]["Row"];

export function seedCategory(overrides: Partial<CategoryRow> = {}): CategoryRow {
  const n = nextId("category");
  return {
    id: `cat_e2e_${pad(n)}`,
    name: `E2E Category ${n}`,
    slug: `e2e-category-${n}`,
    color: "#6366f1",
    description: null,
    created_at: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}

export function seedTopic(overrides: Partial<TopicRow> = {}): TopicRow {
  const n = nextId("topic");
  return {
    id: `top_e2e_${pad(n)}`,
    name: `E2E Topic ${n}`,
    slug: `e2e-category-1-topic-${n}`,
    color: "#6366f1",
    description: null,
    created_at: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}
