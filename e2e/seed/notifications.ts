import type { Database } from "../../src/integrations/supabase/types";
import { nextId, pad } from "./counters";

export type NotificationRow = Database["public"]["Tables"]["notifications"]["Row"];

export function seedNotification(overrides: Partial<NotificationRow> = {}): NotificationRow {
  const n = nextId("notification");
  return {
    id: `notif_e2e_${pad(n)}`,
    user_id: "prof_e2e_001",
    event_type: "system",
    test_id: null,
    title: `E2E Notification ${n}`,
    body: null,
    read_at: null,
    created_at: "2026-05-19T00:00:00.000Z",
    ...overrides,
  };
}
