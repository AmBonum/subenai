// Server-fn skeleton for /admin/respondents list access. AH-7.3 mock-only
// stub: appends a `pii_access: true` audit_log row each time the admin opens
// or filters the respondents list. AH-11 swaps the body to
// `supabaseAdmin.from("audit_log").insert(...)` (kept signature stable).
import { logPiiAccess } from "@/lib/platform/mock-store";

export interface LogRespondentsAccessInput {
  filterTestId?: string;
  filterStatus?: string;
  query?: string;
}

export function logRespondentsAccess(input: LogRespondentsAccessInput = {}): void {
  const details = [
    "Admin otvoril zoznam respondentov",
    input.filterTestId ? `test=${input.filterTestId}` : null,
    input.filterStatus ? `status=${input.filterStatus}` : null,
    input.query ? `query=${input.query}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  // pii_access: true is set inside logPiiAccess via the audit log helper.
  logPiiAccess("__list__", details);
}
