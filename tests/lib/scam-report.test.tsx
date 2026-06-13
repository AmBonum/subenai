// E53.4 — police-report PDF: data mapping + template structure snapshot.
// We render the react-pdf tree to static markup for text-presence
// assertions (the binary pipeline is downstream of pdf().toBlob()).

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildScamReportData,
  buildScamReportFilename,
  SCAM_REPORT_DISCLAIMER,
  SCAM_REPORT_TITLE,
  type ScamReportInput,
} from "@/lib/scam-report/report-data";
import { ScamReportTemplate } from "@/lib/scam-report/scam-report-template";

const FIXED = new Date("2026-06-13T14:05:00Z");

const baseInput: ScamReportInput = {
  risk: "high",
  indicators: ["Žiadosť o platbu vopred", "Tlak na rýchlosť"],
  timeline: ["10:00 prišla SMS", "10:05 výzva na platbu"],
  evidence: ["SMS od neznámeho čísla"],
  nextSteps: ["Neplaťte", "Kontaktujte banku"],
  photos: [{ dataUrl: "data:image/jpeg;base64,AAAA", findings: "SMS s falošným odkazom" }],
  generatedAt: FIXED,
};

describe("buildScamReportData", () => {
  it("maps risk to the Slovak label + recommendsPolice on high", () => {
    const data = buildScamReportData(baseInput);
    expect(data.riskLabel).toBe("Vysoké riziko");
    expect(data.recommendsPolice).toBe(true);
    expect(data.timeline).toEqual(baseInput.timeline);
    expect(data.photos).toHaveLength(1);
  });

  it("does not recommend police for low/medium risk", () => {
    expect(buildScamReportData({ ...baseInput, risk: "low" }).recommendsPolice).toBe(false);
    expect(buildScamReportData({ ...baseInput, risk: "medium" }).recommendsPolice).toBe(false);
  });

  it("formats a deterministic local timestamp", () => {
    // Locale-independent dd.mm.yyyy hh:mm (uses local time; assert the date part).
    expect(buildScamReportData(baseInput).generatedAtLabel).toMatch(
      /^\d{2}\.\d{2}\.2026 \d{2}:\d{2}$/,
    );
  });

  it("builds a dated pdf filename", () => {
    expect(buildScamReportFilename(FIXED)).toBe("podozrenie-podvod-20260613.pdf");
  });
});

describe("ScamReportTemplate", () => {
  const markup = renderToStaticMarkup(ScamReportTemplate({ data: buildScamReportData(baseInput) }));

  it("renders the title, timestamp and risk label", () => {
    expect(markup).toContain(SCAM_REPORT_TITLE);
    expect(markup).toContain("Vysoké riziko");
  });

  it("renders timeline, indicators, evidence and next steps", () => {
    expect(markup).toContain("10:00 prišla SMS");
    expect(markup).toContain("Žiadosť o platbu vopred");
    expect(markup).toContain("SMS od neznámeho čísla");
    expect(markup).toContain("Kontaktujte banku");
  });

  it("embeds the local photo thumbnail + its findings", () => {
    expect(markup).toContain("data:image/jpeg;base64,AAAA");
    expect(markup).toContain("SMS s falošným odkazom");
  });

  it("surfaces the police recommendation on high risk", () => {
    expect(markup).toContain("158");
  });

  it("carries the verbatim legal disclaimer", () => {
    expect(markup).toContain(SCAM_REPORT_DISCLAIMER);
  });
});
