import type { Database } from "../../src/integrations/supabase/types";
import { nextId, pad } from "./counters";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function seedProfile(overrides: Partial<Profile> = {}): Profile {
  const n = nextId("profile");
  const id = `prof_e2e_${pad(n)}`;
  return {
    id,
    email: `profile-${n}@e2e.test`,
    display_name: `E2E Profile ${n}`,
    avatar_initials: `P${n}`,
    created_at: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}
