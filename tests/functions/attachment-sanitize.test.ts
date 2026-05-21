import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";

import {
  sanitizeAttachment,
  sanitizeFilename,
  stripPdfRiskyFeatures,
  computeSha256Hex,
  MAX_ATTACHMENT_BYTES,
} from "../../functions/_lib/attachment-sanitize";

// Helper byte-pattern factories. Real-world test files are kept tiny
// (smallest valid PNG, smallest valid JPEG, hand-crafted PDF) so the
// suite stays deterministic without fixture binaries on disk.

const MINIMAL_PNG = new Uint8Array([
  0x89,
  0x50,
  0x4e,
  0x47,
  0x0d,
  0x0a,
  0x1a,
  0x0a, // signature
  0x00,
  0x00,
  0x00,
  0x0d, // IHDR length
  0x49,
  0x48,
  0x44,
  0x52, // IHDR
  0x00,
  0x00,
  0x00,
  0x01, // width=1
  0x00,
  0x00,
  0x00,
  0x01, // height=1
  0x08,
  0x06,
  0x00,
  0x00,
  0x00, // 8-bit RGBA
  0x1f,
  0x15,
  0xc4,
  0x89, // IHDR CRC
  0x00,
  0x00,
  0x00,
  0x0a, // IDAT length
  0x49,
  0x44,
  0x41,
  0x54, // IDAT
  0x78,
  0x9c,
  0x62,
  0x00,
  0x00,
  0x00,
  0x00,
  0x05,
  0x00,
  0x01, // 1 transparent pixel deflate
  0x0d,
  0x0a,
  0x2d,
  0xb4, // IDAT CRC
  0x00,
  0x00,
  0x00,
  0x00, // IEND length
  0x49,
  0x45,
  0x4e,
  0x44, // IEND
  0xae,
  0x42,
  0x60,
  0x82, // IEND CRC
]);

const MINIMAL_JPEG_PREFIX = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
]);
// JPEG body is filler bytes — magic verify only reads the first 3.
const MINIMAL_JPEG = new Uint8Array(MINIMAL_JPEG_PREFIX.byteLength + 64);
MINIMAL_JPEG.set(MINIMAL_JPEG_PREFIX, 0);

async function buildMinimalPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage();
  return doc.save();
}

async function buildPdfWithJavaScript(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage();
  // Inject an OpenAction with a JS callout via the catalog mutation.
  // pdf-lib's typed API doesn't expose this; we touch the underlying
  // dict directly. This mirrors what a malicious PDF would do.
  const ctx = doc.context;
  const js = ctx.obj({
    S: "JavaScript",
    JS: "app.alert('pwned');",
  });
  const ref = ctx.register(js);
  doc.catalog.set(PDFName.of("OpenAction"), ref);
  return doc.save();
}

/**
 * Build a PDF containing a stream that declares a /Filter naming
 * JBIG2Decode or JPXDecode (or any other name). Used to verify the
 * audit A6 rejection logic in stripPdfRiskyFeatures.
 *
 * Accepts a single filter name (encoded as `/Filter /Name`) or an
 * array of names (encoded as `/Filter [/Name1 /Name2]`).
 */
async function buildPdfWithStreamFilter(filter: string | string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.addPage();
  const ctx = doc.context;
  // ctx.stream() preserves the `Filter` entry we pass; ctx.flateStream
  // would overwrite it with `FlateDecode`. We never decode the stream
  // body — the strip pass only inspects the filter dict entry.
  const filterEntry: unknown = Array.isArray(filter)
    ? filter.map((n) => PDFName.of(n))
    : PDFName.of(filter);
  const stream = ctx.stream(new Uint8Array([0x00, 0x01, 0x02]), {
    Filter: filterEntry,
  });
  ctx.register(stream);
  return doc.save();
}

// Re-export PDFName so the malicious-PDF builder above compiles.
import { PDFName } from "pdf-lib";

describe("sanitizeFilename", () => {
  it("keeps a clean ASCII filename", () => {
    expect(sanitizeFilename("photo.png")).toBe("photo.png");
  });

  it("returns null for empty input", () => {
    expect(sanitizeFilename("")).toBeNull();
    expect(sanitizeFilename("   ")).toBeNull();
  });

  it("returns null for non-string input", () => {
    // @ts-expect-error — exercising runtime guard
    expect(sanitizeFilename(null)).toBeNull();
    // @ts-expect-error — exercising runtime guard
    expect(sanitizeFilename(undefined)).toBeNull();
  });

  it("strips path traversal: ../../etc/passwd -> passwd", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
  });

  it("strips backslash path traversal on Windows-style paths", () => {
    expect(sanitizeFilename("..\\..\\foo.pdf")).toBe("foo.pdf");
  });

  it("replaces spaces and accents with underscores", () => {
    expect(sanitizeFilename("nájdená chyba.png")).toBe("n_jden_chyba.png");
  });

  it("collapses runs of underscores", () => {
    expect(sanitizeFilename("foo   bar___baz.pdf")).toBe("foo_bar_baz.pdf");
  });

  it("rejects filenames that reduce to empty after sanitisation", () => {
    expect(sanitizeFilename("///")).toBeNull();
    expect(sanitizeFilename("???")).toBeNull();
  });

  it("preserves extension when truncating to 200 chars", () => {
    const longStem = "a".repeat(300);
    const out = sanitizeFilename(`${longStem}.pdf`);
    expect(out).not.toBeNull();
    expect(out!.length).toBeLessThanOrEqual(200);
    expect(out!.endsWith(".pdf")).toBe(true);
  });

  it("normalises uppercase extensions but keeps inner case", () => {
    expect(sanitizeFilename("Report.PDF")).toBe("Report.PDF");
  });

  // Audit A7 — Windows reserved device names. Rejected outright so the
  // sanitiser never produces a filename that collides with a device
  // file when an operator exports attachments to a Windows host.
  it("rejects Windows reserved name CON.pdf", () => {
    expect(sanitizeFilename("CON.pdf")).toBeNull();
  });

  it("rejects Windows reserved name NUL.png", () => {
    expect(sanitizeFilename("NUL.png")).toBeNull();
  });

  it("rejects Windows reserved name COM1.jpg", () => {
    expect(sanitizeFilename("COM1.jpg")).toBeNull();
  });

  it("rejects Windows reserved name LPT9.png", () => {
    expect(sanitizeFilename("LPT9.png")).toBeNull();
  });

  it("rejects lowercase prn.pdf (case-insensitive match)", () => {
    expect(sanitizeFilename("prn.pdf")).toBeNull();
  });

  it("strips disallowed chars inside the extension", () => {
    expect(sanitizeFilename("file.p$df")).toBe("file.pdf");
  });
});

describe("computeSha256Hex", () => {
  it("returns 64-hex digest for empty buffer", async () => {
    const hex = await computeSha256Hex(new Uint8Array());
    expect(hex).toMatch(/^[0-9a-f]{64}$/);
    expect(hex).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("returns deterministic digest for known input", async () => {
    const hex = await computeSha256Hex(new TextEncoder().encode("abc"));
    expect(hex).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("stripPdfRiskyFeatures", () => {
  it("re-serialises a clean PDF without errors", async () => {
    const clean = await buildMinimalPdf();
    const stripped = await stripPdfRiskyFeatures(clean);
    expect(stripped.ok).toBe(true);
    if (stripped.ok) {
      expect(stripped.bytes.byteLength).toBeGreaterThan(0);
      // Re-parsing the output should succeed.
      const reparsed = await PDFDocument.load(stripped.bytes);
      expect(reparsed.getPageCount()).toBe(1);
    }
  });

  it("returns pdf_parse_failed for non-PDF bytes", async () => {
    const result = await stripPdfRiskyFeatures(new TextEncoder().encode("not a pdf"));
    expect(result).toEqual({ ok: false, error: "pdf_parse_failed" });
  });

  it("removes embedded JavaScript OpenAction from the catalog", async () => {
    const dirty = await buildPdfWithJavaScript();
    // Sanity: dirty PDF DOES have OpenAction.
    const dirtyParsed = await PDFDocument.load(dirty);
    expect(dirtyParsed.catalog.lookup(PDFName.of("OpenAction"))).not.toBeUndefined();

    const stripped = await stripPdfRiskyFeatures(dirty);
    expect(stripped.ok).toBe(true);
    if (!stripped.ok) throw new Error("expected ok");

    const cleanParsed = await PDFDocument.load(stripped.bytes);
    // OpenAction should now be gone.
    expect(cleanParsed.catalog.lookup(PDFName.of("OpenAction"))).toBeUndefined();
    // Document visual content (page count) preserved.
    expect(cleanParsed.getPageCount()).toBe(1);
  });

  it("removes AcroForm from the catalog", async () => {
    const doc = await PDFDocument.create();
    doc.addPage();
    const ctx = doc.context;
    const form = ctx.obj({ Fields: [] });
    const formRef = ctx.register(form);
    doc.catalog.set(PDFName.of("AcroForm"), formRef);

    const bytes = await doc.save();
    const stripped = await stripPdfRiskyFeatures(bytes);
    expect(stripped.ok).toBe(true);
    if (!stripped.ok) throw new Error("expected ok");
    const reparsed = await PDFDocument.load(stripped.bytes);
    expect(reparsed.catalog.lookup(PDFName.of("AcroForm"))).toBeUndefined();
  });

  // Audit A6 — JBIG2Decode + JPXDecode reject. Both decoders have a
  // long CVE history in Adobe Reader / poppler / mupdf.
  it("rejects PDF with a stream /Filter /JBIG2Decode (pdf_risky_filter)", async () => {
    const bytes = await buildPdfWithStreamFilter("JBIG2Decode");
    const result = await stripPdfRiskyFeatures(bytes);
    expect(result).toEqual({ ok: false, error: "pdf_risky_filter" });
  });

  it("rejects PDF with a stream /Filter [/JPXDecode /FlateDecode]", async () => {
    const bytes = await buildPdfWithStreamFilter(["JPXDecode", "FlateDecode"]);
    const result = await stripPdfRiskyFeatures(bytes);
    expect(result).toEqual({ ok: false, error: "pdf_risky_filter" });
  });
});

describe("sanitizeAttachment — happy paths", () => {
  it("accepts a minimal valid PNG with declared image/png", async () => {
    const r = await sanitizeAttachment({
      bytes: MINIMAL_PNG,
      declaredMime: "image/png",
      declaredFilename: "tiny.png",
    });
    expect(r.ok).toBe(true);
    expect(r.error).toBeUndefined();
    expect(r.mime).toBe("image/png");
    expect(r.filename).toBe("tiny.png");
    expect(r.checksum).toMatch(/^[0-9a-f]{64}$/);
    // v1: image bytes pass through unchanged.
    expect(r.bytes).toEqual(MINIMAL_PNG);
  });

  it("accepts a minimal valid JPEG with declared image/jpeg", async () => {
    const r = await sanitizeAttachment({
      bytes: MINIMAL_JPEG,
      declaredMime: "image/jpeg",
      declaredFilename: "photo.jpg",
    });
    expect(r.ok).toBe(true);
    expect(r.mime).toBe("image/jpeg");
  });

  it("accepts a minimal valid PDF and re-serialises the bytes", async () => {
    const pdf = await buildMinimalPdf();
    const r = await sanitizeAttachment({
      bytes: pdf,
      declaredMime: "application/pdf",
      declaredFilename: "report.pdf",
    });
    expect(r.ok).toBe(true);
    expect(r.mime).toBe("application/pdf");
    // PDF was re-serialised so output bytes != input bytes.
    expect(r.bytes!.byteLength).toBeGreaterThan(0);
  });

  it("strips JavaScript from a malicious PDF in the happy path", async () => {
    const dirty = await buildPdfWithJavaScript();
    const r = await sanitizeAttachment({
      bytes: dirty,
      declaredMime: "application/pdf",
      declaredFilename: "invoice.pdf",
    });
    expect(r.ok).toBe(true);
    // Output should not contain the JS body. We search the serialised
    // bytes for the alert string — a stripped PDF cannot contain it.
    const text = new TextDecoder("latin1").decode(r.bytes!);
    expect(text).not.toContain("app.alert");
  });
});

describe("sanitizeAttachment — rejection paths", () => {
  it("rejects zero-byte upload with size_zero", async () => {
    const r = await sanitizeAttachment({
      bytes: new Uint8Array(),
      declaredMime: "image/png",
      declaredFilename: "empty.png",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("size_zero");
  });

  it("rejects over-size with size_too_large", async () => {
    const big = new Uint8Array(MAX_ATTACHMENT_BYTES + 1);
    big.set(MAGIC_PNG, 0);
    const r = await sanitizeAttachment({
      bytes: big,
      declaredMime: "image/png",
      declaredFilename: "huge.png",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("size_too_large");
  });

  it("rejects unsupported MIME with mime_not_allowed", async () => {
    const r = await sanitizeAttachment({
      bytes: new Uint8Array([0x47, 0x49, 0x46]), // GIF magic
      declaredMime: "image/gif",
      declaredFilename: "anim.gif",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("mime_not_allowed");
  });

  it("rejects SVG even if user claims image/png (declared mime not allowed)", async () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const r = await sanitizeAttachment({
      bytes: svg,
      declaredMime: "image/svg+xml",
      declaredFilename: "shape.svg",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("mime_not_allowed");
  });

  it("rejects polyglot: declared PNG, magic bytes JPEG -> magic_mismatch", async () => {
    const r = await sanitizeAttachment({
      bytes: MINIMAL_JPEG, // JPEG magic
      declaredMime: "image/png", // claims PNG
      declaredFilename: "spoof.png",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("magic_mismatch");
  });

  it("rejects polyglot: declared PDF, magic bytes PNG -> magic_mismatch", async () => {
    const r = await sanitizeAttachment({
      bytes: MINIMAL_PNG,
      declaredMime: "application/pdf",
      declaredFilename: "spoof.pdf",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("magic_mismatch");
  });

  it("rejects ZIP (PK\\x03\\x04) disguised as PDF", async () => {
    const zip = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]);
    const r = await sanitizeAttachment({
      bytes: zip,
      declaredMime: "application/pdf",
      declaredFilename: "archive.pdf",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("magic_mismatch");
  });

  it("rejects HTML disguised as PNG", async () => {
    const html = new TextEncoder().encode("<!DOCTYPE html><html></html>");
    const r = await sanitizeAttachment({
      bytes: html,
      declaredMime: "image/png",
      declaredFilename: "page.png",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("magic_mismatch");
  });

  it("rejects payload too short to match magic signature", async () => {
    const r = await sanitizeAttachment({
      bytes: new Uint8Array([0xff]), // 1 byte
      declaredMime: "image/jpeg",
      declaredFilename: "tiny.jpg",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("magic_mismatch");
  });

  it("rejects filename that reduces to empty after sanitisation", async () => {
    const r = await sanitizeAttachment({
      bytes: MINIMAL_PNG,
      declaredMime: "image/png",
      declaredFilename: "///",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("filename_invalid");
  });

  it("rejects garbage masquerading as PDF -> pdf_parse_failed", async () => {
    // First 5 bytes are valid %PDF- magic but the body is junk so
    // pdf-lib should fail to parse the object tree.
    const garbage = new Uint8Array(64);
    garbage.set([0x25, 0x50, 0x44, 0x46, 0x2d], 0);
    // Rest stays as zeros — not a valid PDF object stream.
    const r = await sanitizeAttachment({
      bytes: garbage,
      declaredMime: "application/pdf",
      declaredFilename: "bad.pdf",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("pdf_parse_failed");
  });

  it("surfaces pdf_risky_filter end-to-end via sanitizeAttachment (audit A6)", async () => {
    const bytes = await buildPdfWithStreamFilter("JBIG2Decode");
    const r = await sanitizeAttachment({
      bytes,
      declaredMime: "application/pdf",
      declaredFilename: "exploit.pdf",
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("pdf_risky_filter");
  });
});

// PNG magic for use in the over-size test above.
const MAGIC_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
