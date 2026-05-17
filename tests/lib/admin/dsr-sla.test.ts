import { describe, it, expect } from "vitest";

import { classifyDsrSla, daysRemaining } from "@/lib/admin/dsr-sla";

const BASE = new Date("2026-05-01T00:00:00.000Z");

function plusDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

describe("classifyDsrSla", () => {
  it("day 0 is ok (30 days remaining)", () => {
    expect(classifyDsrSla(BASE, BASE)).toBe("ok");
  });

  it("day 15 is ok (15 days remaining, just above warn boundary)", () => {
    expect(classifyDsrSla(BASE, plusDays(BASE, 15))).toBe("ok");
  });

  it("day 16 is warn (14 days remaining)", () => {
    expect(classifyDsrSla(BASE, plusDays(BASE, 16))).toBe("warn");
  });

  it("day 27 is warn (3 days remaining, on the warn->overdue boundary)", () => {
    expect(classifyDsrSla(BASE, plusDays(BASE, 27))).toBe("warn");
  });

  it("day 28 is overdue (under 3 days remaining)", () => {
    expect(classifyDsrSla(BASE, plusDays(BASE, 28))).toBe("overdue");
  });

  it("day 30 is overdue (deadline reached)", () => {
    expect(classifyDsrSla(BASE, plusDays(BASE, 30))).toBe("overdue");
  });

  it("day 31 is overdue (past the deadline)", () => {
    expect(classifyDsrSla(BASE, plusDays(BASE, 31))).toBe("overdue");
  });
});

describe("daysRemaining", () => {
  it("returns 30 at the start", () => {
    expect(daysRemaining(BASE, BASE)).toBe(30);
  });

  it("returns a negative number when overdue", () => {
    expect(daysRemaining(BASE, plusDays(BASE, 35))).toBe(-5);
  });
});
