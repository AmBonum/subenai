// AH-11.3 — input builder for the respondents-list PII-access audit event.
// AH-7.3 stored the row through a mock-store helper; the real INSERT now
// goes through the `log_audit_event` RPC (SECURITY DEFINER, admin-gated)
// exposed by `useLogAuditEvent`. This module stays a pure input builder so
// it can be unit-tested without React and reused by the hook caller.
import type { LogAuditEventInput } from "@/lib/admin/queries";

export interface LogRespondentsAccessInput {
  filterTestId?: string;
  filterStatus?: string;
  query?: string;
}

export function buildRespondentsAccessAudit(
  input: LogRespondentsAccessInput = {},
): LogAuditEventInput {
  const note = [
    "Admin otvoril zoznam respondentov",
    input.filterTestId ? `test=${input.filterTestId}` : null,
    input.filterStatus ? `status=${input.filterStatus}` : null,
    input.query ? `query=${input.query}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return {
    action: "respondent.pii_access",
    target_type: "respondent",
    target_id: "__list__",
    pii_access: true,
    details: { note, ...input },
  };
}
