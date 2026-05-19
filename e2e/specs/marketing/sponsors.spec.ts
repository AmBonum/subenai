import { test, expect } from "../../fixtures/base";
import { primeConsent } from "../../fixtures/consent";
import { stubPublicSponsors, makeSponsorRows } from "../../mocks/api/public-sponsors";
import { stubPortalMagicLink } from "../../mocks/api/portal-magic-link";

// ---------------------------------------------------------------------------
// /sponsors
// ---------------------------------------------------------------------------

test.describe("/sponsors — latest sponsors index", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-01: /sponsors renders page heading, hero text, accordion list, and "Celý zoznam s filtrami" link
  test("TC-01: /sponsors renders heading, hero, accordion list, and all-link", async ({
    page,
    sponsors,
  }) => {
    await test.step("Stub Supabase with five sponsor records and navigate to /sponsors at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPublicSponsors(page, {
        status: 200,
        rows: [
          {
            id: "s1",
            display_name: "Anna Novák",
            display_link: null,
            display_message: null,
            created_at: "2026-04-05T10:00:00Z",
            has_refund: false,
          },
          {
            id: "s2",
            display_name: "Ján Kováč",
            display_link: null,
            display_message: null,
            created_at: "2026-04-04T10:00:00Z",
            has_refund: false,
          },
          {
            id: "s3",
            display_name: "Mária Horváth",
            display_link: null,
            display_message: null,
            created_at: "2026-04-03T10:00:00Z",
            has_refund: false,
          },
          {
            id: "s4",
            display_name: "Peter Varga",
            display_link: null,
            display_message: null,
            created_at: "2026-04-02T10:00:00Z",
            has_refund: false,
          },
          {
            id: "s5",
            display_name: "Eva Lukáč",
            display_link: null,
            display_message: null,
            created_at: "2026-04-01T10:00:00Z",
            has_refund: false,
          },
        ],
      });
      await sponsors.open();
    });

    await test.step("Verify document.title equals 'Naši sponzori — subenai'", async () => {
      await expect(page).toHaveTitle("Naši sponzori — subenai");
    });

    await test.step("Verify the h1 heading 'Naši sponzori' is visible", async () => {
      await expect(sponsors.indexHeading).toBeVisible();
      await expect(sponsors.indexHeading).toHaveText("Naši sponzori");
    });

    await test.step("Verify the hero paragraph contains 'Vďaka týmto ľuďom funguje subenai'", async () => {
      await expect(sponsors.indexHero).toContainText("Vďaka týmto ľuďom funguje subenai");
    });

    await test.step("Verify the latest-sponsors section is visible and contains five accordion items", async () => {
      await expect(sponsors.indexLatestSection).toBeVisible();
      await expect(sponsors.indexAccordionItems).toHaveCount(5);
    });

    await test.step("Verify the 'Celý zoznam s filtrami' link pointing to /sponsors/all is visible", async () => {
      await expect(sponsors.indexAllLink).toBeVisible();
      await expect(sponsors.indexAllLink).toHaveText(/Celý zoznam s filtrami/);
      await expect(sponsors.indexAllLink).toHaveAttribute("href", "/sponsors/all");
    });
  });

  // TC-05: /sponsors — Supabase fetch failure shows error state
  test("TC-05: /sponsors — Supabase fetch failure shows error state", async ({
    page,
    sponsors,
  }) => {
    await test.step("Stub Supabase to return HTTP 500 and navigate to /sponsors at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPublicSponsors(page, { status: 500 });
      await sponsors.open();
    });

    await test.step("Verify an element with role='alert' is visible", async () => {
      await expect(sponsors.indexError).toBeVisible();
    });

    await test.step("Verify the alert text contains the expected error message", async () => {
      await expect(sponsors.indexError).toHaveText(
        "Zoznam sa momentálne nepodarilo načítať. Skús stránku obnoviť za chvíľu.",
      );
    });

    await test.step("Verify the accordion list and all-link are not rendered", async () => {
      await expect(sponsors.indexLatestSection).not.toBeAttached();
      await expect(sponsors.indexAllLink).not.toBeAttached();
    });
  });

  // TC-06: /sponsors — empty result shows empty state with /support CTA
  test("TC-06: /sponsors — empty Supabase result shows empty state with /support CTA", async ({
    page,
    sponsors,
  }) => {
    await test.step("Stub Supabase with empty array and navigate to /sponsors at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPublicSponsors(page, { status: 200, rows: [] });
      await sponsors.open();
    });

    await test.step("Verify the empty-state heading 'Buď prvý' is visible", async () => {
      await expect(sponsors.indexEmptyHeading).toBeVisible();
      await expect(sponsors.indexEmptyHeading).toHaveText("Buď prvý");
    });

    await test.step("Verify the empty-state body contains 'Zatiaľ tu nikto nie je.'", async () => {
      await expect(sponsors.indexEmptyBody).toContainText("Zatiaľ tu nikto nie je.");
    });

    await test.step("Verify the 'Podporiť projekt' link pointing to /support is visible", async () => {
      await expect(sponsors.indexEmptyCta).toBeVisible();
      await expect(sponsors.indexEmptyCta).toHaveText(/Podporiť projekt/);
      await expect(sponsors.indexEmptyCta).toHaveAttribute("href", "/support");
    });

    await test.step("Verify the accordion list is not rendered", async () => {
      await expect(sponsors.indexLatestSection).not.toBeAttached();
    });
  });

  // TC-12: /sponsors — robots meta is "index, follow" (not noindex)
  test("TC-12: /sponsors — robots meta is 'index, follow' and canonical is correct", async ({
    page,
    sponsors,
  }) => {
    await test.step("Stub Supabase with empty array and navigate to /sponsors at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPublicSponsors(page, { status: 200, rows: [] });
      await sponsors.open();
    });

    await test.step("Verify meta[name='robots'] content equals 'index, follow'", async () => {
      const robots = await sponsors.robotsContent();
      expect(robots).toBe("index, follow");
    });

    await test.step("Verify link[rel='canonical'] href equals 'https://subenai.sk/sponsors'", async () => {
      const canonical = await sponsors.canonicalHref();
      expect(canonical).toBe("https://subenai.sk/sponsors");
    });
  });

  // TC-14: /sponsors — sponsor with has_refund=true renders "Vrátené" badge and strikethrough name
  test("TC-14: /sponsors — refunded sponsor renders 'Vrátené' badge and strikethrough name", async ({
    page,
    sponsors,
  }) => {
    await test.step("Stub Supabase with one refunded record and navigate to /sponsors at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPublicSponsors(page, {
        status: 200,
        rows: [
          {
            id: "r1",
            display_name: "Refunded Person",
            display_link: null,
            display_message: null,
            created_at: "2026-05-01T00:00:00Z",
            has_refund: true,
          },
        ],
      });
      await sponsors.open();
    });

    await test.step("Click the accordion trigger for 'Refunded Person' to expand it", async () => {
      await sponsors.accordionTrigger("Refunded Person").click();
    });

    await test.step("Verify the 'Vrátené' badge is visible", async () => {
      await expect(sponsors.indexRefundBadge).toBeVisible();
      await expect(sponsors.indexRefundBadge).toHaveText("Vrátené");
    });

    await test.step("Verify the sponsor name has the line-through class applied", async () => {
      const nameEl = sponsors.indexLatestSection.locator("span.line-through");
      await expect(nameEl).toBeVisible();
      await expect(nameEl).toContainText("Refunded Person");
    });

    await test.step("Verify the expanded content contains the refund notice", async () => {
      const content = sponsors.indexLatestSection.getByText(
        /Príspevok bol vrátený na žiadosť prispievateľa\./,
      );
      await expect(content).toBeVisible();
    });
  });

  // TC-16: /sponsors — sponsor with display_link renders external link with correct rel
  test("TC-16: /sponsors — display_link renders external link with rel='noopener noreferrer'", async ({
    page,
    sponsors,
  }) => {
    await test.step("Stub Supabase with one record that has a display_link and navigate to /sponsors at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPublicSponsors(page, {
        status: 200,
        rows: [
          {
            id: "l1",
            display_name: "Link Sponsor",
            display_link: "https://example.com",
            display_message: null,
            created_at: "2026-03-01T00:00:00Z",
            has_refund: false,
          },
        ],
      });
      await sponsors.open();
    });

    await test.step("Click the accordion trigger to expand 'Link Sponsor'", async () => {
      await sponsors.accordionTrigger("Link Sponsor").click();
    });

    await test.step("Verify the external link has correct href, target=_blank, and rel with noopener and noreferrer", async () => {
      const link = sponsors.indexLatestSection.locator('a[href="https://example.com"]');
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute("target", "_blank");
      const rel = await link.getAttribute("rel");
      expect(rel).toContain("noopener");
      expect(rel).toContain("noreferrer");
    });

    await test.step("Verify the link's visible text is 'example.com' (scheme stripped)", async () => {
      const link = sponsors.indexLatestSection.locator('a[href="https://example.com"]');
      await expect(link).toContainText("example.com");
    });
  });

  // TC-21: /sponsors — footer note renders with mailto contact link
  test("TC-21: /sponsors — footer note is visible with mailto link", async ({ page, sponsors }) => {
    await test.step("Stub Supabase with empty array and navigate to /sponsors at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPublicSponsors(page, { status: 200, rows: [] });
      await sponsors.open();
    });

    await test.step("Verify the footer note paragraph is visible and contains the expected text", async () => {
      await expect(sponsors.indexFooterNote).toBeVisible();
      await expect(sponsors.indexFooterNote).toContainText(
        "Zoznam je dobrovoľný — mnohí sponzori si zvolili anonymitu",
      );
    });

    await test.step("Verify the paragraph contains a mailto link pointing to the project contact email", async () => {
      await expect(sponsors.indexFooterMailto).toBeVisible();
      await expect(sponsors.indexFooterMailto).toHaveAttribute(
        "href",
        "mailto:subenai.podpora@gmail.com",
      );
    });
  });

  // TC-22: Mobile viewport (375×667) — /sponsors accordion renders without horizontal overflow
  test("TC-22: Mobile 375×667 — /sponsors accordion renders without horizontal overflow", async ({
    page,
    sponsors,
  }) => {
    await test.step("Stub Supabase with two records and navigate to /sponsors at 375×667", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await stubPublicSponsors(page, {
        status: 200,
        rows: makeSponsorRows(2),
      });
      await sponsors.open();
    });

    await test.step("Verify the latest-sponsors section is visible within the viewport", async () => {
      await expect(sponsors.indexLatestSection).toBeVisible();
    });

    await test.step("Verify no horizontal overflow on the document", async () => {
      const hasOverflow = await sponsors.hasContentHorizontalOverflow("sponzori-index-root");
      expect(hasOverflow).toBe(false);
    });

    await test.step("Verify the 'Celý zoznam s filtrami' link is visible", async () => {
      await expect(sponsors.indexAllLink).toBeVisible();
    });
  });

  // TC-25: /sponsors — "← Späť na domov" back link navigates to /
  test("TC-25: /sponsors — back link navigates to /", async ({ page, sponsors }) => {
    await test.step("Stub Supabase with empty array and navigate to /sponsors at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPublicSponsors(page, { status: 200, rows: [] });
      await sponsors.open();
    });

    await test.step("Click '← Späť na domov' and verify navigation to /", async () => {
      await sponsors.indexBackLink.click();
      await expect(page).toHaveURL(/\/$/);
    });
  });
});

// ---------------------------------------------------------------------------
// /sponsors/all
// ---------------------------------------------------------------------------

test.describe("/sponsors/all — filterable sponsor list", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-02: /sponsors/all renders heading, filter controls, and the full card grid
  test("TC-02: /sponsors/all renders heading, filters, card grid, and count status", async ({
    page,
    sponsors,
  }) => {
    await test.step("Stub Supabase with three sponsor records and navigate to /sponsors/all at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPublicSponsors(page, {
        status: 200,
        rows: makeSponsorRows(3),
      });
      await sponsors.openAll();
    });

    await test.step("Verify document.title equals 'Všetci sponzori — subenai'", async () => {
      await expect(page).toHaveTitle("Všetci sponzori — subenai");
    });

    await test.step("Verify the h1 heading 'Všetci sponzori' is visible", async () => {
      await expect(sponsors.allHeading).toBeVisible();
      await expect(sponsors.allHeading).toHaveText("Všetci sponzori");
    });

    await test.step("Verify all four filter controls are visible", async () => {
      await expect(sponsors.filterName).toBeVisible();
      await expect(sponsors.filterDateFrom).toBeVisible();
      await expect(sponsors.filterDateTo).toBeVisible();
      await expect(sponsors.filterStatus).toBeVisible();
    });

    await test.step("Verify the card list contains three items", async () => {
      await expect(sponsors.allCardItems).toHaveCount(3);
    });

    await test.step("Verify the count status text reads 'Zobrazených 3 (všetkých 3)'", async () => {
      await expect(sponsors.allCountStatus).toBeVisible();
      await expect(sponsors.allCountStatus).toHaveText("Zobrazených 3 (všetkých 3)");
    });
  });

  // TC-07: /sponsors/all — name filter with no matches shows filtered empty state
  test("TC-07: /sponsors/all — name filter with no match shows empty filter state", async ({
    page,
    sponsors,
  }) => {
    await test.step("Stub Supabase with one record and navigate to /sponsors/all at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPublicSponsors(page, {
        status: 200,
        rows: [
          {
            id: "s1",
            display_name: "Anna Novák",
            display_link: null,
            display_message: null,
            created_at: "2026-04-01T00:00:00Z",
            has_refund: false,
          },
        ],
      });
      await sponsors.openAll();
    });

    await test.step("Type 'zzz_no_match' into the name search input", async () => {
      await sponsors.filterName.fill("zzz_no_match");
    });

    await test.step("Verify the card list disappears", async () => {
      await expect(sponsors.allCardList).not.toBeAttached();
    });

    await test.step("Verify the empty-filter message is visible", async () => {
      await expect(sponsors.allEmptyMessage).toBeVisible();
      await expect(sponsors.allEmptyMessage).toHaveText(
        "Nič nezodpovedá filtru. Skús iné meno alebo rok.",
      );
    });

    await test.step("Verify the count status region is not shown", async () => {
      await expect(sponsors.allCountStatus).not.toBeAttached();
    });
  });

  // TC-13: /sponsors/all — robots meta is "index, follow" and canonical points to /sponsors/all
  test("TC-13: /sponsors/all — robots meta is 'index, follow' and canonical is correct", async ({
    page,
    sponsors,
  }) => {
    await test.step("Stub Supabase with empty array and navigate to /sponsors/all at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPublicSponsors(page, { status: 200, rows: [] });
      await sponsors.openAll();
    });

    await test.step("Verify meta[name='robots'] content equals 'index, follow'", async () => {
      const robots = await sponsors.robotsContent();
      expect(robots).toBe("index, follow");
    });

    await test.step("Verify link[rel='canonical'] href equals 'https://subenai.sk/sponsors/all'", async () => {
      const canonical = await sponsors.canonicalHref();
      expect(canonical).toBe("https://subenai.sk/sponsors/all");
    });
  });

  // TC-15: /sponsors/all — "Vrátené" badge and strikethrough render in card grid
  test("TC-15: /sponsors/all — refunded card shows 'Vrátené' badge, strikethrough, and refund note", async ({
    page,
    sponsors,
  }) => {
    await test.step("Stub Supabase with one refunded record and navigate to /sponsors/all at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPublicSponsors(page, {
        status: 200,
        rows: [
          {
            id: "r1",
            display_name: "Refund Corp",
            display_link: null,
            display_message: "Test message",
            created_at: "2026-05-01T00:00:00Z",
            has_refund: true,
          },
        ],
      });
      await sponsors.openAll();
    });

    await test.step("Verify the card for 'Refund Corp' is visible", async () => {
      await expect(sponsors.allCardItems.first()).toBeVisible();
    });

    await test.step("Verify the 'Vrátené' badge inside the card has text 'Vrátené'", async () => {
      await expect(sponsors.allRefundBadge).toBeVisible();
      await expect(sponsors.allRefundBadge).toHaveText("Vrátené");
    });

    await test.step("Verify the heading element for 'Refund Corp' has a line-through style class", async () => {
      const nameHeading = sponsors.allCardList.locator("h2.line-through");
      await expect(nameHeading).toBeVisible();
      await expect(nameHeading).toContainText("Refund Corp");
    });

    await test.step("Verify the card contains the refund note text", async () => {
      await expect(sponsors.allCardItems.first()).toContainText(
        "Príspevok bol vrátený na žiadosť prispievateľa.",
      );
    });
  });

  // TC-17: /sponsors/all — status filter "Prijaté" hides refunded records
  test("TC-17: /sponsors/all — status filter 'Prijaté' hides refunded records", async ({
    page,
    sponsors,
  }) => {
    await test.step("Stub Supabase with one active and one refunded record, navigate to /sponsors/all at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPublicSponsors(page, {
        status: 200,
        rows: [
          {
            id: "a1",
            display_name: "Active Sponsor",
            display_link: null,
            display_message: null,
            created_at: "2026-05-01T00:00:00Z",
            has_refund: false,
          },
          {
            id: "r1",
            display_name: "Refund Sponsor",
            display_link: null,
            display_message: null,
            created_at: "2026-04-01T00:00:00Z",
            has_refund: true,
          },
        ],
      });
      await sponsors.openAll();
    });

    await test.step("Change the status select to 'accepted' (option labelled 'Prijaté')", async () => {
      await sponsors.filterStatus.selectOption("accepted");
    });

    await test.step("Verify the card for 'Active Sponsor' is visible", async () => {
      await expect(sponsors.allCardList.getByText("Active Sponsor")).toBeVisible();
    });

    await test.step("Verify the card for 'Refund Sponsor' is not visible", async () => {
      await expect(sponsors.allCardList.getByText("Refund Sponsor")).not.toBeAttached();
    });

    await test.step("Verify the count status text reads 'Zobrazených 1 z 2'", async () => {
      await expect(sponsors.allCountStatus).toHaveText("Zobrazených 1 z 2");
    });
  });

  // TC-18: /sponsors/all — date-range filter excludes records outside the range
  test("TC-18: /sponsors/all — date-from filter excludes records before the date", async ({
    page,
    sponsors,
  }) => {
    await test.step("Stub Supabase with January and May records, navigate to /sponsors/all at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPublicSponsors(page, {
        status: 200,
        rows: [
          {
            id: "j1",
            display_name: "January Sponsor",
            display_link: null,
            display_message: null,
            created_at: "2026-01-15T00:00:00Z",
            has_refund: false,
          },
          {
            id: "m1",
            display_name: "May Sponsor",
            display_link: null,
            display_message: null,
            created_at: "2026-05-10T00:00:00Z",
            has_refund: false,
          },
        ],
      });
      await sponsors.openAll();
    });

    await test.step("Set 'Od dátumu' filter to 2026-05-01", async () => {
      await sponsors.filterDateFrom.fill("2026-05-01");
    });

    await test.step("Verify only the card for 'May Sponsor' is visible", async () => {
      await expect(sponsors.allCardList.getByText("May Sponsor")).toBeVisible();
    });

    await test.step("Verify the card for 'January Sponsor' is not visible", async () => {
      await expect(sponsors.allCardList.getByText("January Sponsor")).not.toBeAttached();
    });

    await test.step("Verify the count status text reads 'Zobrazených 1 z 2'", async () => {
      await expect(sponsors.allCountStatus).toHaveText("Zobrazených 1 z 2");
    });
  });

  // TC-24: /sponsors/all — XSS payload in search query does not execute
  test("TC-24: /sponsors/all — XSS payload in name filter does not execute", async ({
    page,
    sponsors,
  }) => {
    await test.step("Stub Supabase with one record and navigate to /sponsors/all at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPublicSponsors(page, {
        status: 200,
        rows: [
          {
            id: "x1",
            display_name: "Safe Sponsor",
            display_link: null,
            display_message: null,
            created_at: "2026-05-01T00:00:00Z",
            has_refund: false,
          },
        ],
      });
      await sponsors.openAll();
    });

    await test.step("Type XSS payload into the filter-name input", async () => {
      await sponsors.filterName.fill("<script>window.__xss=1</script>");
    });

    await test.step("Verify window.__xss is undefined in the page context", async () => {
      const marker = await sponsors.xssMarker();
      expect(marker).toBeUndefined();
    });

    await test.step("Verify the empty-filter message is displayed without injecting any markup", async () => {
      await expect(sponsors.allEmptyMessage).toBeVisible();
      await expect(sponsors.allEmptyMessage).toContainText("Nič nezodpovedá filtru.");
    });
  });

  // TC-26: /sponsors/all — "← Späť na najnovších sponzorov" back link navigates to /sponsors
  test("TC-26: /sponsors/all — back link navigates to /sponsors", async ({ page, sponsors }) => {
    await test.step("Stub Supabase with empty array and navigate to /sponsors/all at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPublicSponsors(page, { status: 200, rows: [] });
      await sponsors.openAll();
    });

    await test.step("Click '← Späť na najnovších sponzorov' and verify navigation to /sponsors", async () => {
      await sponsors.allBackLink.click();
      await expect(page).toHaveURL(/\/sponsors\/?$/);
    });
  });
});

// ---------------------------------------------------------------------------
// /manage-support
// ---------------------------------------------------------------------------

test.describe("/manage-support — self-service portal link request", () => {
  test.beforeEach(async ({ context }) => {
    await primeConsent(context, "all");
  });

  // TC-03: /manage-support renders the email-request form in its default state
  test("TC-03: /manage-support renders the form in its default empty state", async ({
    page,
    manageSupport,
  }) => {
    await test.step("Navigate to /manage-support at 1280×800 with a clean session", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await manageSupport.open();
    });

    await test.step("Verify document.title equals 'Spravovať podporu — subenai'", async () => {
      await expect(page).toHaveTitle("Spravovať podporu — subenai");
    });

    await test.step("Verify the h1 heading 'Spravovať podporu' is visible", async () => {
      await expect(manageSupport.heading).toBeVisible();
      await expect(manageSupport.heading).toHaveText("Spravovať podporu");
    });

    await test.step("Verify the email input is visible and empty", async () => {
      await expect(manageSupport.emailInput).toBeVisible();
      await expect(manageSupport.emailInput).toHaveValue("");
    });

    await test.step("Verify the submit button labelled 'Poslať odkaz na e-mail' is disabled", async () => {
      await expect(manageSupport.submitButton).toBeDisabled();
    });

    await test.step("Verify the anti-enumeration hint paragraph is visible", async () => {
      await expect(manageSupport.antiEnumHint).toBeVisible();
      await expect(manageSupport.antiEnumHint).toContainText("Bezpečnostná poznámka:");
    });
  });

  // TC-04: /manage-support — valid email + Turnstile bypass → submitted state shown after API 200
  test("TC-04: /manage-support — valid email and API 200 → submitted state shown", async ({
    page,
    manageSupport,
  }) => {
    await test.step("Stub portal-magic-link to return 200 and navigate to /manage-support at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPortalMagicLink(page, { status: 200, body: {} });
      await manageSupport.open();
    });

    await test.step("Type 'test@example.com' into the email input", async () => {
      await manageSupport.emailInput.fill("test@example.com");
    });

    await test.step("Click the 'Poslať odkaz na e-mail' button", async () => {
      await expect(manageSupport.submitButton).not.toBeDisabled();
      await manageSupport.submitButton.click();
    });

    await test.step("Verify the form is replaced by the submitted confirmation section", async () => {
      await expect(manageSupport.submittedSection).toBeVisible();
    });

    await test.step("Verify the heading 'Skontroluj e-mail' is visible", async () => {
      await expect(manageSupport.submittedHeading).toBeVisible();
    });

    await test.step("Verify the confirmation paragraph contains the address in a strong element and '1 hodinu'", async () => {
      const strongEl = manageSupport.submittedSection.locator("strong").first();
      await expect(strongEl).toContainText("test@example.com");
      await expect(manageSupport.submittedSection).toContainText("1 hodinu");
    });
  });

  // TC-08: /manage-support — submit button remains disabled while email is syntactically invalid
  test("TC-08: /manage-support — invalid email keeps submit button disabled", async ({
    page,
    manageSupport,
  }) => {
    await test.step("Navigate to /manage-support at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await manageSupport.open();
    });

    await test.step("Type 'notanemail' into the email input", async () => {
      await manageSupport.emailInput.fill("notanemail");
    });

    await test.step("Verify the submit button remains disabled", async () => {
      await expect(manageSupport.submitButton).toBeDisabled();
    });
  });

  // TC-09: /manage-support — API 500 shows inline error and does not advance to submitted state
  test("TC-09: /manage-support — API 500 shows inline error without advancing to submitted state", async ({
    page,
    manageSupport,
  }) => {
    await test.step("Stub portal-magic-link to return 500 and navigate to /manage-support at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPortalMagicLink(page, { status: 500, body: { error: "internal" } });
      await manageSupport.open();
    });

    await test.step("Type 'test@example.com' into the email input", async () => {
      await manageSupport.emailInput.fill("test@example.com");
    });

    await test.step("Click 'Poslať odkaz na e-mail'", async () => {
      await manageSupport.submitButton.click();
    });

    await test.step("Verify an element with role='alert' is visible", async () => {
      await expect(manageSupport.errorAlert).toBeVisible();
    });

    await test.step("Verify the alert contains the error code 'internal' and the contact email mailto link", async () => {
      await expect(manageSupport.errorAlert).toContainText("internal");
      const mailtoLink = manageSupport.errorAlert.locator('a[href^="mailto:"]');
      await expect(mailtoLink).toBeVisible();
    });

    await test.step("Verify the submitted state heading 'Skontroluj e-mail' is NOT present", async () => {
      await expect(manageSupport.submittedSection).not.toBeAttached();
    });
  });

  // TC-10: /manage-support — API 429 (rate limit) shows inline error
  test("TC-10: /manage-support — API 429 shows inline error without advancing to submitted state", async ({
    page,
    manageSupport,
  }) => {
    await test.step("Stub portal-magic-link to return 429 and navigate to /manage-support at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPortalMagicLink(page, { status: 429, body: { error: "rate_limited" } });
      await manageSupport.open();
    });

    await test.step("Type 'test@example.com' into the email input", async () => {
      await manageSupport.emailInput.fill("test@example.com");
    });

    await test.step("Click 'Poslať odkaz na e-mail'", async () => {
      await manageSupport.submitButton.click();
    });

    await test.step("Verify an element with role='alert' is visible and contains 'rate_limited'", async () => {
      await expect(manageSupport.errorAlert).toBeVisible();
      await expect(manageSupport.errorAlert).toContainText("rate_limited");
    });

    await test.step("Verify the submitted state heading 'Skontroluj e-mail' is NOT present", async () => {
      await expect(manageSupport.submittedSection).not.toBeAttached();
    });
  });

  // TC-11: /manage-support — network failure shows network_error code inline
  test("TC-11: /manage-support — network failure shows 'network_error' and re-enables submit", async ({
    page,
    manageSupport,
  }) => {
    await test.step("Stub portal-magic-link to abort and navigate to /manage-support at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPortalMagicLink(page, { abort: true });
      await manageSupport.open();
    });

    await test.step("Type 'test@example.com' into the email input", async () => {
      await manageSupport.emailInput.fill("test@example.com");
    });

    await test.step("Click 'Poslať odkaz na e-mail'", async () => {
      await manageSupport.submitButton.click();
    });

    await test.step("Verify the error alert contains 'network_error'", async () => {
      await expect(manageSupport.errorAlert).toBeVisible();
      await expect(manageSupport.errorAlert).toContainText("network_error");
    });

    await test.step("Verify the submit button is re-enabled (no longer showing 'Posielam…')", async () => {
      await expect(manageSupport.submitButton).not.toBeDisabled();
      await expect(manageSupport.submitButton).not.toContainText("Posielam…");
    });
  });

  // TC-19: /manage-support — anti-enumeration: non-existent email still shows success state
  test("TC-19: /manage-support — non-existent email still shows success state (anti-enumeration)", async ({
    page,
    manageSupport,
  }) => {
    await test.step("Stub portal-magic-link to return 200 for any input and navigate to /manage-support at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPortalMagicLink(page, { status: 200, body: {} });
      await manageSupport.open();
    });

    await test.step("Type 'nonexistent@example.com' into the email input", async () => {
      await manageSupport.emailInput.fill("nonexistent@example.com");
    });

    await test.step("Click 'Poslať odkaz na e-mail'", async () => {
      await manageSupport.submitButton.click();
    });

    await test.step("Verify the submitted state section is shown with heading 'Skontroluj e-mail'", async () => {
      await expect(manageSupport.submittedSection).toBeVisible();
      await expect(manageSupport.submittedHeading).toBeVisible();
    });

    await test.step("Verify only the single success template is displayed (no customer-found vs not-found branching)", async () => {
      await expect(manageSupport.errorAlert).not.toBeAttached();
    });
  });

  // TC-20: /manage-support — submit button shows "Posielam…" during in-flight request
  test("TC-20: /manage-support — submit button shows 'Posielam…' during in-flight request", async ({
    page,
    manageSupport,
  }) => {
    await test.step("Stub portal-magic-link with 1000ms delay and navigate to /manage-support at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPortalMagicLink(page, { delay: 1000, status: 200, body: {} });
      await manageSupport.open();
    });

    await test.step("Type 'test@example.com' into the email input", async () => {
      await manageSupport.emailInput.fill("test@example.com");
    });

    await test.step("Click 'Poslať odkaz na e-mail' and immediately verify in-flight state", async () => {
      await manageSupport.submitButton.click();
      await expect(manageSupport.submitButton).toContainText("Posielam…");
      await expect(manageSupport.submitButton).toBeDisabled();
    });

    await test.step("After the response arrives, verify the submitted state section is shown", async () => {
      await expect(manageSupport.submittedSection).toBeVisible();
    });
  });

  // TC-23: Mobile viewport (375×667) — /manage-support form fields are fully usable
  test("TC-23: Mobile 375×667 — /manage-support form fields are fully usable", async ({
    page,
    manageSupport,
  }) => {
    await test.step("Navigate to /manage-support at 375×667 with a clean session", async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      await manageSupport.open();
    });

    await test.step("Verify the email input and submit button are all visible", async () => {
      await expect(manageSupport.emailInput).toBeVisible();
      await expect(manageSupport.submitButton).toBeVisible();
    });

    await test.step("Verify no element overflows the viewport horizontally", async () => {
      const hasOverflow = await manageSupport.hasHorizontalOverflow();
      expect(hasOverflow).toBe(false);
    });

    await test.step("Verify the submit button's tap target is at least 44 px tall", async () => {
      const height = await manageSupport.submitButtonHeight();
      expect(height).toBeGreaterThanOrEqual(44);
    });
  });

  // TC-27: Keyboard-only: /manage-support form is fully operable without a mouse
  test("TC-27: Keyboard-only — /manage-support form submits without a pointer device", async ({
    page,
    manageSupport,
  }) => {
    await test.step("Stub portal-magic-link to return 200 and navigate to /manage-support at 1280×800", async () => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await stubPortalMagicLink(page, { status: 200, body: {} });
      await manageSupport.open();
    });

    await test.step("Tab until focus reaches the email input and type keyboard@example.com", async () => {
      let focused = false;
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press("Tab");
        const isFocused = await manageSupport.emailInput.evaluate(
          (el) => el === document.activeElement,
        );
        if (isFocused) {
          focused = true;
          break;
        }
      }
      expect(focused).toBe(true);
      await page.keyboard.type("keyboard@example.com");
    });

    await test.step("Tab past the Turnstile container to advance focus to the submit button", async () => {
      let focused = false;
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("Tab");
        const isFocused = await manageSupport.submitButton.evaluate(
          (el) => el === document.activeElement,
        );
        if (isFocused) {
          focused = true;
          break;
        }
      }
      expect(focused).toBe(true);
    });

    await test.step("Press Enter on the focused submit button", async () => {
      await page.keyboard.press("Enter");
    });

    await test.step("Verify the submitted state heading 'Skontroluj e-mail' becomes visible", async () => {
      await expect(manageSupport.submittedHeading).toBeVisible();
    });
  });
});
