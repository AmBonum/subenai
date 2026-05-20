/**
 * E40.3 — Structural test for the Slovak Art. 28 DPA template.
 *
 * Renders the DpaTemplate React tree (no PDF binary — that's downstream
 * of react-pdf's pdf().toBuffer() pipeline) and asserts:
 *   - Every Art. 28(3) clause (a–k) is present in the rendered text
 *   - Both parties are identified (prevádzkovateľ + sprostredkovateľ)
 *   - The watermark renders when isDraft=true, NOT when isDraft=false
 *   - Sub-processors from SUB_PROCESSORS appear in Annex B
 *   - Footer + page count signals exist
 *
 * The legal text is a v0.1 DRAFT — these assertions guard the structural
 * shape so a refactor (e.g. extracting clauses into smaller components)
 * cannot silently drop a mandatory section.
 */

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { DpaTemplate } from "@/lib/dpa/dpa-template";
import { SUB_PROCESSORS } from "@/lib/dpa/sub-processors";

const baseProps = {
  schoolName: "Gymnázium Zlatá brána",
  contactName: "Jana Nováková",
  contactEmail: "jana@gymzlb.sk",
  requestId: "11111111-2222-3333-4444-555555555555",
  generatedAt: new Date("2026-05-20T10:00:00Z"),
  version: "v0.1",
  isDraft: true,
};

// react-pdf primitives (Document, Page, Text, View) render as their own
// element names in static markup. renderToStaticMarkup handles that fine
// for our purposes — we only inspect textContent shape.
function staticMarkup(props = baseProps): string {
  // @ts-expect-error — react-pdf JSX isn't a normal React DOM tree; we
  // intentionally serialise it for text-presence assertions only.
  return renderToStaticMarkup(DpaTemplate(props));
}

describe("DpaTemplate", () => {
  const markup = staticMarkup();

  it("identifies both parties by their legal-correct Slovak roles", () => {
    expect(markup).toContain("Prevádzkovateľ");
    expect(markup).toContain("Sprostredkovateľ");
    expect(markup).toContain("am.bonum s. r. o.");
    expect(markup).toContain(baseProps.schoolName);
    expect(markup).toContain(baseProps.contactEmail);
  });

  it("contains every Art. 28(3)(a)-(k) mandatory clause heading", () => {
    expect(markup).toContain("Predmet, doba, povaha a účel"); // (a)
    expect(markup).toContain("Typ osobných údajov"); // (b)
    expect(markup).toContain("Povinnosti a práva prevádzkovateľa"); // (c)
    expect(markup).toContain("Pokyny prevádzkovateľa"); // (d)
    expect(markup).toContain("Mlčanlivosť"); // (e)
    expect(markup).toContain("Bezpečnostné opatrenia"); // (f)
    expect(markup).toContain("Sub-sprostredkovatelia"); // (g)
    expect(markup).toContain("práv dotknutých osôb"); // (h)
    expect(markup).toContain("Incidenty a DPIA"); // (i)
    expect(markup).toContain("Vrátenie a výmaz údajov"); // (j)
    expect(markup).toContain("Audit a inšpekcia"); // (k)
  });

  it("includes the 12-month auto-anonymisation commitment", () => {
    expect(markup).toContain("12 mesiacov");
    expect(markup).toContain("anonymizácii");
  });

  it("emits Annex A (categories of data subjects) and Annex B (security + sub-processors)", () => {
    expect(markup).toContain("Príloha A");
    expect(markup).toContain("Príloha B");
    expect(markup).toContain("Technické a organizačné opatrenia");
    expect(markup).toContain("TLS 1.2");
  });

  it("renders every sub-processor from the registry in Annex B", () => {
    for (const sp of SUB_PROCESSORS) {
      expect(markup).toContain(sp.name);
    }
  });

  it("stamps the request ID and version in the footer", () => {
    expect(markup).toContain(baseProps.requestId.slice(0, 8));
    expect(markup).toContain(baseProps.version);
  });

  it("renders the DRAFT watermark when isDraft=true", () => {
    expect(markup).toContain("DRAFT");
    expect(markup).toContain("NEZAVÄZUJÚCA UKÁŽKA");
  });

  it("hides the DRAFT watermark when isDraft=false", () => {
    const finalMarkup = staticMarkup({ ...baseProps, isDraft: false });
    expect(finalMarkup).not.toContain("NEZAVÄZUJÚCA UKÁŽKA");
  });

  it("contains the signature block with both party labels", () => {
    expect(markup).toContain("Za prevádzkovateľa");
    expect(markup).toContain("Za sprostredkovateľa");
  });
});
