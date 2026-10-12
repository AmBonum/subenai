import { describe, expect, it } from "vitest";

import { getPublicDoc, listPublicDocs } from "@/content/docs";
import { SCENE3D_LINE, isScene3DName } from "@/lib/docs/doc-body";
import { APP_DOCS } from "@/lib/docs/manifest";

// E66.5 — B2B user guides: each one exists, carries a 3D scene and numbered
// steps, every scene shortcode resolves, and gated /docs/app guide entries
// point at a real public doc.

const B2B_GUIDES = [
  "skolenie-za-5-minut",
  "zdielanie-testu",
  "vysledky-a-export",
  "doklad-o-preskoleni",
  "predplatne-a-faktury",
  "pre-skoly",
];

describe("B2B user guides", () => {
  it.each(B2B_GUIDES)("%s has a 3D scene and numbered steps", (slug) => {
    const doc = getPublicDoc(slug);
    expect(doc, `missing public doc ${slug}`).not.toBeNull();
    expect(doc!.body).toMatch(/^\[\[scene3d:[a-z-]+/m);
    expect(doc!.body).toMatch(/^1\. /m);
  });

  it("every scene shortcode in public docs names a registered scene", () => {
    for (const doc of listPublicDocs()) {
      for (const line of doc.body.split("\n")) {
        if (!line.trim().startsWith("[[scene3d:")) continue;
        const match = line.trim().match(SCENE3D_LINE);
        expect(match, `${doc.slug}: malformed "${line}"`).not.toBeNull();
        expect(isScene3DName(match![1]), `${doc.slug}: unknown scene ${match![1]}`).toBe(true);
      }
    }
  });

  it("never claims NIS2 compliance", () => {
    for (const doc of listPublicDocs()) {
      expect(doc.body).not.toMatch(/NIS2 compliant|v súlade s NIS2|súlad s NIS2/i);
    }
  });

  it("every /docs/app guide entry resolves to a public doc", () => {
    for (const [slug, entry] of Object.entries(APP_DOCS)) {
      if (entry.kind !== "guide") continue;
      expect(getPublicDoc(entry.docSlug), `APP_DOCS["${slug}"]`).not.toBeNull();
    }
  });
});
