import { describe, it, expect } from "vitest";

import { buildRespondentsAccessAudit } from "@/lib/admin/respondents.functions";

describe("buildRespondentsAccessAudit (AH-11.3)", () => {
  it("encodes filter context as a pii_access=true audit input", () => {
    const input = buildRespondentsAccessAudit({
      filterTestId: "tst_test_1",
      query: "anna",
    });
    expect(input.action).toBe("respondent.pii_access");
    expect(input.target_type).toBe("respondent");
    expect(input.target_id).toBe("__list__");
    expect(input.pii_access).toBe(true);
    const details = input.details as Record<string, unknown>;
    expect(String(details.note)).toContain("zoznam respondentov");
    expect(String(details.note)).toContain("test=tst_test_1");
    expect(String(details.note)).toContain("query=anna");
    expect(details.filterTestId).toBe("tst_test_1");
    expect(details.query).toBe("anna");
  });

  it("emits a minimal payload with no filters", () => {
    const input = buildRespondentsAccessAudit();
    expect(input.action).toBe("respondent.pii_access");
    const details = input.details as Record<string, unknown>;
    expect(String(details.note)).toBe("Admin otvoril zoznam respondentov");
  });
});
