import type { Page } from "@playwright/test";

export interface EvidenceReportRow {
  org_name: string;
  test_title: string;
  test_version: number;
  created_at: string;
  respondent_count: number;
  passed_count: number;
  content_sha256: string;
}

export type VerifyEvidenceReportStub = { status: 200; rows: EvidenceReportRow[] } | { status: 500 };

export interface VerifyEvidenceReportMock {
  readonly callCount: () => number;
}

/** Stubs Supabase RPC `verify_evidence_report` and counts the requests that reach it. */
export async function stubVerifyEvidenceReport(
  page: Page,
  stub: VerifyEvidenceReportStub,
): Promise<VerifyEvidenceReportMock> {
  let calls = 0;
  await page.route("**/rest/v1/rpc/verify_evidence_report*", async (route) => {
    calls += 1;
    if (stub.status === 500) {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "rpc_failed" }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(stub.rows),
    });
  });
  return { callCount: () => calls };
}
