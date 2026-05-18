import { describe, it, expect, vi, beforeEach } from "vitest";

const enroll = vi.fn();
const challenge = vi.fn();
const verify = vi.fn();
const unenroll = vi.fn();
const listFactorsMock = vi.fn();
const getAAL = vi.fn();
const rpc = vi.fn();
const from = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      mfa: {
        enroll: (args: unknown) => enroll(args),
        challenge: (args: unknown) => challenge(args),
        verify: (args: unknown) => verify(args),
        unenroll: (args: unknown) => unenroll(args),
        listFactors: () => listFactorsMock(),
        getAuthenticatorAssuranceLevel: () => getAAL(),
      },
    },
    rpc: (fn: string, args?: unknown) => rpc(fn, args),
    from: (table: string) => from(table),
  },
}));

import {
  enrollTotp,
  challengeAndVerify,
  getAALStatus,
  listFactors,
  unenrollFactor,
  generateBackupCodes,
  consumeBackupCode,
  remainingBackupCodes,
} from "@/lib/auth/mfa";

describe("mfa helpers", () => {
  beforeEach(() => {
    enroll.mockReset();
    challenge.mockReset();
    verify.mockReset();
    unenroll.mockReset();
    listFactorsMock.mockReset();
    getAAL.mockReset();
    rpc.mockReset();
    from.mockReset();
  });

  it("enrollTotp returns id/qr/secret/uri", async () => {
    enroll.mockResolvedValue({
      data: { id: "f1", type: "totp", totp: { qr_code: "QR", secret: "S", uri: "U" } },
      error: null,
    });
    const res = await enrollTotp("My device");
    expect(res).toEqual({ factorId: "f1", qrCode: "QR", secret: "S", uri: "U" });
    expect(enroll).toHaveBeenCalledWith({ factorType: "totp", friendlyName: "My device" });
  });

  it("enrollTotp throws on supabase error", async () => {
    enroll.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(enrollTotp()).rejects.toThrow("boom");
  });

  it("challengeAndVerify chains challenge -> verify with the code", async () => {
    challenge.mockResolvedValue({ data: { id: "c1", expires_at: 0 }, error: null });
    verify.mockResolvedValue({ data: {}, error: null });
    await challengeAndVerify("f1", "123456");
    expect(challenge).toHaveBeenCalledWith({ factorId: "f1" });
    expect(verify).toHaveBeenCalledWith({ factorId: "f1", challengeId: "c1", code: "123456" });
  });

  it("challengeAndVerify surfaces verify errors", async () => {
    challenge.mockResolvedValue({ data: { id: "c1" }, error: null });
    verify.mockResolvedValue({ data: null, error: { message: "invalid code" } });
    await expect(challengeAndVerify("f1", "000000")).rejects.toThrow("invalid code");
  });

  it("getAALStatus returns currentLevel + nextLevel", async () => {
    getAAL.mockResolvedValue({ data: { currentLevel: "aal2", nextLevel: "aal2" }, error: null });
    expect(await getAALStatus()).toEqual({ currentLevel: "aal2", nextLevel: "aal2" });
  });

  it("getAALStatus returns nulls on error", async () => {
    getAAL.mockResolvedValue({ data: null, error: { message: "x" } });
    expect(await getAALStatus()).toEqual({ currentLevel: null, nextLevel: null });
  });

  it("listFactors returns the totp list", async () => {
    listFactorsMock.mockResolvedValue({
      data: { totp: [{ id: "f1", status: "verified" }] },
      error: null,
    });
    const res = await listFactors();
    expect(res.totp).toHaveLength(1);
  });

  it("unenrollFactor calls supabase with factorId", async () => {
    unenroll.mockResolvedValue({ data: null, error: null });
    await unenrollFactor("f1");
    expect(unenroll).toHaveBeenCalledWith({ factorId: "f1" });
  });

  it("generateBackupCodes returns the array from RPC", async () => {
    rpc.mockResolvedValue({ data: ["AAAA-BBBB", "CCCC-DDDD"], error: null });
    const codes = await generateBackupCodes();
    expect(codes).toEqual(["AAAA-BBBB", "CCCC-DDDD"]);
    expect(rpc).toHaveBeenCalledWith("generate_mfa_backup_codes", undefined);
  });

  it("consumeBackupCode returns true on RPC success", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await consumeBackupCode("AAAA-BBBB")).toBe(true);
    expect(rpc).toHaveBeenCalledWith("consume_mfa_backup_code", { p_code: "AAAA-BBBB" });
  });

  it("consumeBackupCode returns false on RPC error or non-true data", async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null });
    expect(await consumeBackupCode("BAD")).toBe(false);
    rpc.mockResolvedValueOnce({ data: null, error: { message: "x" } });
    expect(await consumeBackupCode("BAD")).toBe(false);
  });

  it("remainingBackupCodes uses head+count query, filtered by used_at null", async () => {
    const is = vi.fn().mockResolvedValue({ count: 5, error: null });
    const select = vi.fn().mockReturnValue({ is });
    from.mockReturnValue({ select });
    const n = await remainingBackupCodes();
    expect(n).toBe(5);
    expect(from).toHaveBeenCalledWith("mfa_backup_codes");
    expect(select).toHaveBeenCalledWith("id", { count: "exact", head: true });
    expect(is).toHaveBeenCalledWith("used_at", null);
  });

  it("remainingBackupCodes returns 0 on error", async () => {
    const is = vi.fn().mockResolvedValue({ count: null, error: { message: "x" } });
    const select = vi.fn().mockReturnValue({ is });
    from.mockReturnValue({ select });
    expect(await remainingBackupCodes()).toBe(0);
  });
});
