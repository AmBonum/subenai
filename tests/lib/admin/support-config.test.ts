import { describe, it, expect } from "vitest";
import {
  isValidEmail,
  isValidPhone,
  validateSupportChannelConfig,
  defaultSupportChannelConfig,
  updateSupportChannelConfig,
  resetSupportChannelConfig,
} from "@/lib/admin/support-config";

describe("support-config validators", () => {
  it("isValidEmail accepts well-formed addresses", () => {
    expect(isValidEmail("a@b.cz")).toBe(true);
    expect(isValidEmail("foo.bar@example.sk")).toBe(true);
  });

  it("isValidEmail rejects malformed values", () => {
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("a@")).toBe(false);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("isValidPhone accepts SK-style numbers", () => {
    expect(isValidPhone("+421900123456")).toBe(true);
    expect(isValidPhone("+421 900 123 456")).toBe(true);
    expect(isValidPhone("0900 123 456")).toBe(true);
  });

  it("isValidPhone rejects too-short or text values", () => {
    expect(isValidPhone("abc")).toBe(false);
    expect(isValidPhone("123")).toBe(false);
    expect(isValidPhone("")).toBe(false);
  });

  it("validateSupportChannelConfig reports per-field errors", () => {
    const r = validateSupportChannelConfig({ email: "nope", phone: "abc" });
    expect(r.ok).toBe(false);
    expect(r.errors.email).toBe("invalid_email");
    expect(r.errors.phone).toBe("invalid_phone");
  });

  it("validateSupportChannelConfig passes on valid input", () => {
    const r = validateSupportChannelConfig({
      email: "ok@example.sk",
      phone: "+421900111222",
    });
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual({});
  });

  it("updateSupportChannelConfig merges and bumps updated_at; reset restores defaults", () => {
    const updated = updateSupportChannelConfig({ email: "new@subenai.sk" });
    expect(updated.email).toBe("new@subenai.sk");
    const back = resetSupportChannelConfig();
    expect(back.email).toBe(defaultSupportChannelConfig.email);
  });
});
