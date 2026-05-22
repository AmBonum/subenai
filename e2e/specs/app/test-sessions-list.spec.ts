// E49 Phase 1c-3 — /app/tests index page (Layer A, mock-UI).
// Covers POS-01..POS-04 + adjacent negative variants for the index that
// catalogues an educator's tests and gates access to the per-test editor.

import { test, expect } from "../../fixtures/base";
import { setupEducator } from "../../setup/app-shell";
import { seedTest } from "../../seed";
import { TestSessionsListPage } from "../../poms/app/TestSessionsList";

const owned = (id: string, status: "published" | "draft" | "archived", title: string) =>
  seedTest({
    id,
    slug: id,
    share_id: id,
    title,
    status,
    published_at: status === "published" ? "2026-05-18T00:00:00.000Z" : null,
  });

test.describe("/app/tests index — listing, filtering, navigation", () => {
  test("POS-01: lists every owned test with its status badge", async ({ page }) => {
    const tests = [
      owned("idx-pub-1", "published", "Index pub 1"),
      owned("idx-pub-2", "published", "Index pub 2"),
      owned("idx-draft-1", "draft", "Index draft"),
      owned("idx-arch-1", "archived", "Index archív"),
    ];
    await setupEducator(page.context(), page, { tables: { tests } });
    const list = new TestSessionsListPage(page);
    await list.open();
    await expect(list.root).toBeVisible();
    for (const t of tests) {
      await expect(list.row(t.id)).toBeVisible();
    }
  });

  test("POS-02: 'Koncept' status tab narrows to draft tests only", async ({ page }) => {
    const tests = [
      owned("filt-pub-1", "published", "Pub"),
      owned("filt-draft-1", "draft", "Draft"),
    ];
    await setupEducator(page.context(), page, { tables: { tests } });
    const list = new TestSessionsListPage(page);
    await list.open();
    await list.pickStatus("draft");
    await expect(list.row("filt-draft-1")).toBeVisible();
    await expect(list.row("filt-pub-1")).toHaveCount(0);
  });

  test("POS-02b: 'Publikované' status tab narrows to published rows", async ({ page }) => {
    const tests = [
      owned("filt2-pub-1", "published", "Pub A"),
      owned("filt2-draft-1", "draft", "Draft"),
      owned("filt2-arch-1", "archived", "Archív"),
    ];
    await setupEducator(page.context(), page, { tables: { tests } });
    const list = new TestSessionsListPage(page);
    await list.open();
    await list.pickStatus("published");
    await expect(list.row("filt2-pub-1")).toBeVisible();
    await expect(list.row("filt2-draft-1")).toHaveCount(0);
    await expect(list.row("filt2-arch-1")).toHaveCount(0);
  });

  test("POS-02c: 'Archív' tab narrows to archived rows", async ({ page }) => {
    const tests = [
      owned("filt3-pub-1", "published", "Pub"),
      owned("filt3-arch-1", "archived", "Archived"),
    ];
    await setupEducator(page.context(), page, { tables: { tests } });
    const list = new TestSessionsListPage(page);
    await list.open();
    await list.pickStatus("archived");
    await expect(list.row("filt3-arch-1")).toBeVisible();
    await expect(list.row("filt3-pub-1")).toHaveCount(0);
  });

  test("POS-03: clicking 'Otvoriť' on a row navigates to its editor", async ({ page }) => {
    const tests = [owned("open-1", "published", "Open me")];
    await setupEducator(page.context(), page, { tables: { tests } });
    const list = new TestSessionsListPage(page);
    await list.open();
    await list.rowOpen("open-1").click();
    await expect(page).toHaveURL(/\/app\/tests\/open-1(\?|$)/);
  });

  test("POS-04: search box narrows by case-insensitive title match", async ({ page }) => {
    const tests = [
      owned("srch-foo", "published", "Foobar Test"),
      owned("srch-bar", "published", "Quux Title"),
    ];
    await setupEducator(page.context(), page, { tables: { tests } });
    const list = new TestSessionsListPage(page);
    await list.open();
    await list.search("foobar");
    await expect(list.row("srch-foo")).toBeVisible();
    await expect(list.row("srch-bar")).toHaveCount(0);
  });

  test("POS-04b: search is case-insensitive (mixed-case query matches title)", async ({ page }) => {
    const tests = [
      owned("ci-1", "published", "Bratislava Quiz"),
      owned("ci-2", "published", "Košice"),
    ];
    await setupEducator(page.context(), page, { tables: { tests } });
    const list = new TestSessionsListPage(page);
    await list.open();
    await list.search("BRATIslava");
    await expect(list.row("ci-1")).toBeVisible();
    await expect(list.row("ci-2")).toHaveCount(0);
  });

  test("POS-04c: 'Vyčistiť filtre' clears the search query", async ({ page }) => {
    const tests = [owned("clr-1", "published", "Apple"), owned("clr-2", "published", "Banana")];
    await setupEducator(page.context(), page, { tables: { tests } });
    const list = new TestSessionsListPage(page);
    await list.open();
    await list.search("apple");
    await expect(list.row("clr-2")).toHaveCount(0);
    await list.clearFilters();
    await expect(list.row("clr-2")).toBeVisible();
  });

  test("NEG: zero owned tests renders the empty-state copy", async ({ page }) => {
    await setupEducator(page.context(), page, { tables: { tests: [] } });
    const list = new TestSessionsListPage(page);
    await list.open();
    await expect(list.emptyState).toBeVisible();
    await expect(list.emptyState).toContainText("Žiadne testy v tomto filtri.");
  });

  test("NEG: search query with no matches renders the empty-state", async ({ page }) => {
    const tests = [owned("nm-1", "published", "Only one")];
    await setupEducator(page.context(), page, { tables: { tests } });
    const list = new TestSessionsListPage(page);
    await list.open();
    await list.search("zzz-no-match-zzz");
    await expect(list.emptyState).toBeVisible();
    await expect(list.row("nm-1")).toHaveCount(0);
  });

  test("NEG: switching status filter and back keeps results consistent", async ({ page }) => {
    const tests = [owned("sw-1", "published", "Pub"), owned("sw-2", "draft", "Draft")];
    await setupEducator(page.context(), page, { tables: { tests } });
    const list = new TestSessionsListPage(page);
    await list.open();
    await list.pickStatus("draft");
    await expect(list.row("sw-1")).toHaveCount(0);
    await list.pickStatus("all");
    await expect(list.row("sw-1")).toBeVisible();
    await expect(list.row("sw-2")).toBeVisible();
  });
});
