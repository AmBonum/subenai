// E53.4 — police-report PDF data mapping (transport-free, unit-tested).
// Maps a server triage assessment + local photo thumbnails into the props
// the React-PDF template renders. No image bytes ever leave the device:
// thumbnails are data URLs derived from local File objects in the widget.

export type TriageRisk = "low" | "medium" | "high";

export interface ScamReportEvidencePhoto {
  /** Full-res data: URL of the local original File — never uploaded. */
  dataUrl: string;
  /** Model-extracted findings for this photo (E53.5). */
  findings: string;
}

export interface ScamReportInput {
  risk: TriageRisk;
  indicators: string[];
  timeline: string[];
  evidence: string[];
  nextSteps: string[];
  photos?: ScamReportEvidencePhoto[];
  generatedAt?: Date;
}

export interface ScamReportData {
  riskLabel: string;
  generatedAtLabel: string;
  indicators: string[];
  timeline: string[];
  evidence: string[];
  nextSteps: string[];
  photos: ScamReportEvidencePhoto[];
  /** True for high risk — the template surfaces the police-contact block. */
  recommendsPolice: boolean;
}

// Verbatim per AC E53.4. Exported so the snapshot test and the widget can
// assert against the same constant.
export const SCAM_REPORT_DISCLAIMER =
  "Tento dokument je automaticky generované zhrnutie a nie je právnym posúdením.";

export const SCAM_REPORT_TITLE = "Zhrnutie podozrenia na podvod";
export const SCAM_REPORT_POLICE_LINE =
  "Odporúčame kontaktovať políciu: tiesňová linka 158 alebo najbližšie obvodné oddelenie PZ.";

const RISK_LABELS: Record<TriageRisk, string> = {
  low: "Nízke riziko",
  medium: "Stredné riziko",
  high: "Vysoké riziko",
};

function formatTimestamp(date: Date): string {
  // Slovak-style dd.mm.yyyy hh:mm, locale-independent so the snapshot is
  // deterministic across CI machines.
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(date.getDate())}.${p(date.getMonth() + 1)}.${date.getFullYear()} ${p(date.getHours())}:${p(date.getMinutes())}`;
}

export function buildScamReportData(input: ScamReportInput): ScamReportData {
  const generatedAt = input.generatedAt ?? new Date();
  return {
    riskLabel: RISK_LABELS[input.risk],
    generatedAtLabel: formatTimestamp(generatedAt),
    indicators: input.indicators,
    timeline: input.timeline,
    evidence: input.evidence,
    nextSteps: input.nextSteps,
    photos: input.photos ?? [],
    recommendsPolice: input.risk === "high",
  };
}

export function buildScamReportFilename(generatedAt: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${generatedAt.getFullYear()}${p(generatedAt.getMonth() + 1)}${p(generatedAt.getDate())}`;
  return `podozrenie-podvod-${stamp}.pdf`;
}
