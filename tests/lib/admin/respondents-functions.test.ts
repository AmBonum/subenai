import { describe, it, expect } from "vitest";

import { logRespondentsAccess } from "@/lib/admin/respondents.functions";
import { useAudit } from "@/lib/platform/mock-store";
import { renderHook } from "@testing-library/react";

describe("logRespondentsAccess (AH-7.3)", () => {
  it("appends one audit_log entry with pii_access: true and a respondents details string", () => {
    const before = renderHook(() => useAudit()).result.current.length;
    logRespondentsAccess({ filterTestId: "tst_test_1", query: "anna" });
    const after = renderHook(() => useAudit()).result.current;
    expect(after.length).toBe(before + 1);
    const head = after[0];
    expect(head.pii_access).toBe(true);
    expect(head.action).toBe("respondent.pii_access");
    expect(head.details).toContain("zoznam respondentov");
    expect(head.details).toContain("test=tst_test_1");
    expect(head.details).toContain("query=anna");
  });

  it("propagates the current user as the actor", () => {
    const before = renderHook(() => useAudit()).result.current[0];
    logRespondentsAccess();
    const after = renderHook(() => useAudit()).result.current[0];
    expect(after.actor_id).toBeTruthy();
    expect(after.actor_name).toBeTruthy();
    expect(after.id).not.toBe(before?.id);
  });
});
