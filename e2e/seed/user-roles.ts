import type { Database } from "../../src/integrations/supabase/types";
import { nextId, pad } from "./counters";

export type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];

export function seedUserRole(overrides: Partial<UserRole> = {}): UserRole {
  const n = nextId("user_role");
  return {
    id: `role_e2e_${pad(n)}`,
    user_id: `prof_e2e_${pad(n)}`,
    role: "user",
    created_at: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}
