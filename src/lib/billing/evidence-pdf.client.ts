import type { EvidenceReport } from "./evidence-types";

export async function renderEvidencePdfBlob(report: EvidenceReport, origin: string): Promise<Blob> {
  const [{ pdf }, { EvidenceReportPdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./evidence-pdf-template"),
  ]);
  return pdf(EvidenceReportPdf({ report, origin })).toBlob();
}
