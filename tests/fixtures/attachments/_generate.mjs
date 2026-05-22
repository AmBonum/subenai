import { writeFileSync } from "node:fs";

// Smallest valid 1×1 PNG (transparent pixel)
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAen63NgAAAAASUVORK5CYII=",
  "base64",
);
writeFileSync(new URL("./small-image.png", import.meta.url), tinyPng);

// Minimal JPG (red 1x1 pixel) — can use a base64-encoded buffer
const tinyJpg = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==",
  "base64",
);
writeFileSync(new URL("./medium-image.jpg", import.meta.url), tinyJpg);

// Minimal PDF (single page, "Test PDF" text)
const tinyPdf = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 24 Tf 50 700 Td (Test PDF) Tj ET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000234 00000 n\n0000000327 00000 n\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n397\n%%EOF",
  "binary",
);
writeFileSync(new URL("./document.pdf", import.meta.url), tinyPdf);

// Multi-page PDF placeholder — duplicate of document.pdf for now
writeFileSync(new URL("./text-document.pdf", import.meta.url), tinyPdf);

console.log("Generated: small-image.png, medium-image.jpg, document.pdf, text-document.pdf");
