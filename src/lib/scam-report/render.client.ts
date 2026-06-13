// E53.4 — client-side police-report PDF renderer.
//
// Lazy-imports @react-pdf/renderer + the template so the ~250 KB gz chunk
// only lands when the user actually clicks "Stiahnuť PDF". Same pattern as
// src/lib/dpa/render.client.ts. The report is assembled and rendered
// ENTIRELY in the browser — full-resolution photo originals are embedded
// from local File objects and never transit our infrastructure.

import { buildScamReportData, type ScamReportInput } from "./report-data";

export async function renderScamReportPdfBlob(input: ScamReportInput): Promise<Blob> {
  const [{ pdf }, { ScamReportTemplate }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./scam-report-template"),
  ]);
  const data = buildScamReportData(input);
  return pdf(ScamReportTemplate({ data })).toBlob();
}
