import { describe, expect, it } from "vitest";

import { safeAppRedirect } from "@/lib/auth/safe-redirect";

describe("safeAppRedirect", () => {
  it.each([
    "/app",
    "/app/billing?plan=firma",
    "/app/tests/new?step=1&templateId=00000000-0000-4000-8000-000000000006",
    "/app/tests/abc/doklad",
  ])("keeps the in-app deep link %s", (path) => {
    expect(safeAppRedirect(path)).toBe(path);
  });

  it.each([
    undefined,
    null,
    42,
    "",
    "/",
    "/admin",
    "/application",
    "//evil.example/app",
    "/app//evil.example",
    "/app\\evil",
    "https://evil.example/app",
    "javascript:alert(1)",
    `/app/${"x".repeat(600)}`,
  ])("rejects %j", (raw) => {
    expect(safeAppRedirect(raw)).toBeNull();
  });
});
