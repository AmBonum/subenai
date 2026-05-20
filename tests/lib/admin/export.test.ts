import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { exportToCSV, exportToJSON } from "@/lib/admin/export";

// E40 close-out — the CSV export helper is used by the governance
// queues (/admin/dsr, /admin/dpa-requests) for GDPR Art. 30 records-of-
// processing audit trails. The escape logic is the security-relevant
// surface here: a malformed quote in a row would corrupt the entire CSV
// for the auditor (or open a CSV-injection vector if a cell starts with
// "=" — though that's a separate Excel-side concern, not RFC 4180).
//
// These tests lock the RFC 4180-ish escape rules:
//   - cells with `,` `"` `\n` `;` get wrapped in double-quotes
//   - inner double-quotes get doubled (`"` → `""`)
//   - the file starts with a UTF-8 BOM (U+FEFF) so Excel doesn't mangle
//     Slovak diacritics
//   - undefined / null cells render as empty
//   - the download is triggered via a synthetic <a download> click

interface BlobCapture {
  blobs: Blob[];
  texts: string[];
  filenames: string[];
}

function setupDomCapture(): BlobCapture {
  const capture: BlobCapture = { blobs: [], texts: [], filenames: [] };
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  URL.createObjectURL = vi.fn(async (b: Blob) => {
    capture.blobs.push(b);
    capture.texts.push(await b.text());
    return "blob:mock";
  }) as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = vi.fn() as unknown as typeof URL.revokeObjectURL;
  const originalClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    capture.filenames.push(this.download);
  };

  // Restore on teardown via a Symbol stored on globalThis.
  // (Vitest's `afterEach` in each test resets the spies — simpler.)
  Object.assign(globalThis, {
    __exportTestRestore: () => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      HTMLAnchorElement.prototype.click = originalClick;
    },
  });

  return capture;
}

function restore() {
  (globalThis as { __exportTestRestore?: () => void }).__exportTestRestore?.();
}

describe("exportToCSV", () => {
  let capture: BlobCapture;

  beforeEach(() => {
    capture = setupDomCapture();
  });

  afterEach(() => {
    restore();
  });

  it("starts with a UTF-8 BOM so Excel renders Slovak diacritics", async () => {
    exportToCSV([{ a: "č" }], [{ key: "a", label: "A" }], "x");
    await waitForBlob();
    // jsdom's Blob.text() strips the BOM from the decoded string, so we
    // assert on the raw bytes instead — that's what Excel reads.
    const bytes = new Uint8Array(await capture.blobs[0].arrayBuffer());
    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
  });

  it('quotes cells containing , " \\n ;', async () => {
    exportToCSV(
      [{ a: 'has "quote" and , comma', b: "line\nbreak", c: "semi;colon", d: "plain" }],
      [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
        { key: "c", label: "C" },
        { key: "d", label: "D" },
      ],
      "x",
    );
    await waitForBlob();
    const csv = capture.texts[0];
    expect(csv).toContain('"has ""quote"" and , comma"');
    expect(csv).toContain('"line\nbreak"');
    expect(csv).toContain('"semi;colon"');
    // plain has none of the trigger chars — must NOT be wrapped
    expect(csv).toContain(",plain");
  });

  it("renders null / undefined cells as empty (not the literal string 'null')", async () => {
    exportToCSV(
      [{ a: null, b: undefined, c: "ok" }],
      [
        { key: "a", label: "A" },
        { key: "b", label: "B" },
        { key: "c", label: "C" },
      ],
      "x",
    );
    await waitForBlob();
    const body = capture.texts[0].split("\n")[1];
    expect(body).toBe(",,ok");
  });

  it("ensures the download filename ends with .csv", async () => {
    exportToCSV([{ a: 1 }], [{ key: "a", label: "A" }], "report-2026-05");
    await waitForBlob();
    expect(capture.filenames[0]).toBe("report-2026-05.csv");
  });

  it("does not double-append .csv if the caller already provided it", async () => {
    exportToCSV([{ a: 1 }], [{ key: "a", label: "A" }], "report.csv");
    await waitForBlob();
    expect(capture.filenames[0]).toBe("report.csv");
  });

  // ── Allow the createObjectURL mock to resolve its Promise before
  // assertions run. The util itself is synchronous so it returns before
  // Blob.text() resolves inside the spy.
  async function waitForBlob() {
    for (let i = 0; i < 10 && capture.texts.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
});

describe("exportToJSON", () => {
  let capture: BlobCapture;

  beforeEach(() => {
    capture = setupDomCapture();
  });

  afterEach(() => {
    restore();
  });

  it("writes pretty-printed JSON with .json filename", async () => {
    exportToJSON({ a: 1, b: [2, 3] }, "snapshot");
    for (let i = 0; i < 10 && capture.texts.length === 0; i++) {
      await new Promise((r) => setTimeout(r, 0));
    }
    expect(capture.filenames[0]).toBe("snapshot.json");
    expect(capture.texts[0]).toContain('"a": 1');
    expect(capture.texts[0]).toContain('"b": [\n    2,\n    3\n  ]');
  });
});
