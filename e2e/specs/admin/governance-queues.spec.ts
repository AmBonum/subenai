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
