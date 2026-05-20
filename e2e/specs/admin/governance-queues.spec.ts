import { test, expect } from "../../fixtures/base";
import { setupAdmin } from "../../setup/app-shell";
import {
  AdminAuditPage,
  AdminDsrPage,
  AdminReportsPage,
} from "../../poms/admin/AdminGovernanceQueuesPage";

/**
 * Composite spec for the three governance read-views in /admin:
 * audit log, DSR queue, reports queue. Each route is a thin shell
 * mounting a component. Phase 7 session 4 ships smoke-baseline
 * coverage; deeper interactions (filter persistence, row mutations)
 * are deferred per `specs/admin/governance-queues.md`.
 */

test.describe("/admin/audit — audit log viewer", () => {
  test("TC-01: page renders with empty state when audit_log is empty", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, {
      tables: { audit_log: [] },
    });

    const audit = new AdminAuditPage(page);
    await audit.open();

    await expect(audit.root).toBeVisible();
    await expect(audit.pageHeaderTitle).toHaveText("Audit log");
    await expect(audit.viewerRoot).toBeVisible();
    await expect(audit.emptyState).toBeVisible();
    await expect(audit.rowByPrefix()).toHaveCount(0);
  });
});

test.describe("/admin/audit — populated read flow (E43)", () => {
  // E43 — locks the audit-log READ side end-to-end. Insert side is
  // covered by tests/lib/supabase/audit-log-immutable.test.ts plus the
  // RLS-enforcement integration suite; this spec exercises the viewer
  // the way an admin actually uses it.
  const baseRow = {
    actor_id: "00000000-0000-0000-0000-000000000aaa",
    target_type: "respondent",
    target_id: "respondent-id",
    details: "noted",
  };
  const seededRows = [
    {
      ...baseRow,
      id: "audit-001",
      actor_name: "alice",
      action: "respondent_invite_sent",
      pii_access: false,
      at: "2026-05-20T12:00:00.000Z",
    },
    {
      ...baseRow,
      id: "audit-002",
      actor_name: "alice",
      action: "dsr_request_resolved",
      pii_access: true,
      at: "2026-05-20T11:00:00.000Z",
    },
    {
      ...baseRow,
      id: "audit-003",
      actor_name: "bob",
      action: "respondent_invite_sent",
      pii_access: false,
      at: "2026-05-20T10:00:00.000Z",
    },
  ];

  test("TC-04: renders table and rows when audit_log is populated", async ({ context, page }) => {
    await setupAdmin(context, page, { tables: { audit_log: seededRows } });

    const audit = new AdminAuditPage(page);
    await audit.open();

    await expect(audit.viewerRoot).toBeVisible();
    await expect(audit.table).toBeVisible();
    await expect(audit.emptyState).toHaveCount(0);
    await expect(audit.rowByPrefix()).toHaveCount(3);
  });

  test("TC-05: actor filter narrows visible rows", async ({ context, page }) => {
    await setupAdmin(context, page, { tables: { audit_log: seededRows } });

    const audit = new AdminAuditPage(page);
    await audit.open();
    await audit.filterActor.fill("alice");

    await expect(audit.rowByPrefix()).toHaveCount(2);
    await expect(audit.rowById("audit-001")).toBeVisible();
    await expect(audit.rowById("audit-002")).toBeVisible();
    await expect(audit.rowById("audit-003")).toHaveCount(0);
  });

  test("TC-06: action filter narrows visible rows", async ({ context, page }) => {
    await setupAdmin(context, page, { tables: { audit_log: seededRows } });

    const audit = new AdminAuditPage(page);
    await audit.open();
    await audit.selectAction("dsr_request_resolved");

    await expect(audit.rowByPrefix()).toHaveCount(1);
    await expect(audit.rowById("audit-002")).toBeVisible();
  });

  test("TC-07: PII-only filter shows only rows with pii_access=true", async ({ context, page }) => {
    await setupAdmin(context, page, { tables: { audit_log: seededRows } });

    const audit = new AdminAuditPage(page);
    await audit.open();
    await audit.selectPiiOnly();

    await expect(audit.rowByPrefix()).toHaveCount(1);
    await expect(audit.rowById("audit-002")).toBeVisible();
  });

  test("TC-08: pagination advances by PAGE_SIZE (25)", async ({ context, page }) => {
    // 30 rows → page 1 = 25 visible, page 2 = 5 visible.
    const rows = Array.from({ length: 30 }, (_, i) => ({
      ...baseRow,
      id: `audit-page-${String(i).padStart(3, "0")}`,
      actor_name: "alice",
      action: "respondent_invite_sent",
      pii_access: false,
      // Distinct timestamps so the .order("at", desc) projection is
      // deterministic (one row per minute, latest first).
      at: new Date(Date.UTC(2026, 4, 20, 12, 0, i)).toISOString(),
    }));
    await setupAdmin(context, page, { tables: { audit_log: rows } });

    const audit = new AdminAuditPage(page);
    await audit.open();

    await expect(audit.rowByPrefix()).toHaveCount(25);
    await expect(audit.paginationPrev).toBeDisabled();
    await expect(audit.paginationNext).toBeEnabled();

    await audit.paginationNext.click();

    await expect(audit.rowByPrefix()).toHaveCount(5);
    await expect(audit.paginationNext).toBeDisabled();
    await expect(audit.paginationPrev).toBeEnabled();
  });
});

test.describe("/admin/dsr — DSR queue", () => {
  test("TC-02: page renders with seeded open request, header count interpolates", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, {
      tables: {
        dsr_requests: [
          {
            id: "dsr_001",
            requester_email: "subject@example.com",
            type: "access",
            status: "open",
            note: null,
            created_at: "2026-05-19T00:00:00Z",
            sla_due_at: "2026-06-18T00:00:00Z",
            resolved_at: null,
          },
        ],
      },
    });

    const dsr = new AdminDsrPage(page);
    await dsr.open();

    await expect(dsr.root).toBeVisible();
    await expect(dsr.queueRoot).toBeVisible();
    // The header description interpolates `{open}` count; assert "1"
    // appears since exactly one seeded row has status "open".
    await expect(dsr.pageHeaderDescription).toContainText("1");
    await expect(dsr.table).toBeVisible();
    await expect(dsr.rowByPrefix()).toHaveCount(1);
  });
});

test.describe("/admin/reports — reports queue", () => {
  test("TC-03: page renders with empty state when reports table is empty", async ({
    context,
    page,
  }) => {
    await setupAdmin(context, page, {
      tables: { reports: [] },
    });

    const reports = new AdminReportsPage(page);
    await reports.open();

    await expect(reports.root).toBeVisible();
    await expect(reports.queueRoot).toBeVisible();
    await expect(reports.emptyState).toBeVisible();
    await expect(reports.rowByPrefix()).toHaveCount(0);
  });
});
