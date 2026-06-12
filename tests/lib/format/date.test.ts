import { describe, expect, it } from "vitest";
import { formatDateSk, formatDateLongSk, formatDateTimeSk } from "@/lib/format/date";

describe("formatDateSk", () => {
  it("formats a Date as numeric Slovak date", () => {
    expect(formatDateSk(new Date(2026, 5, 10))).toBe("10. 6. 2026");
  });

  it("parses date-only ISO strings as local dates (no UTC shift)", () => {
    expect(formatDateSk("2026-06-10")).toBe("10. 6. 2026");
    expect(formatDateSk("2026-01-01")).toBe("1. 1. 2026");
  });

  it("accepts full ISO timestamps", () => {
    expect(formatDateSk(new Date("2026-06-10T12:00:00").getTime())).toBe("10. 6. 2026");
  });

  it("returns the input unchanged when unparseable", () => {
    expect(formatDateSk("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDateLongSk", () => {
  it("formats with the genitive month name", () => {
    expect(formatDateLongSk(new Date(2026, 5, 10))).toBe("10. júna 2026");
  });

  it("parses date-only ISO strings as local dates", () => {
    expect(formatDateLongSk("2026-05-20")).toBe("20. mája 2026");
  });

  it("returns the input unchanged when unparseable", () => {
    expect(formatDateLongSk("garbage")).toBe("garbage");
  });
});

describe("formatDateTimeSk", () => {
  it("formats date + time without seconds", () => {
    // ICU versions disagree on the comma between date and time — accept both.
    expect(formatDateTimeSk(new Date(2026, 5, 10, 14, 5))).toMatch(/^10\. 6\. 2026,? 14:05$/);
  });

  it("returns the input unchanged when unparseable", () => {
    expect(formatDateTimeSk("garbage")).toBe("garbage");
  });
});
