import { describe, it, expect, vi, beforeEach } from "vitest";

const enroll = vi.fn();
const challenge = vi.fn();
const verify = vi.fn();
const unenroll = vi.fn();
const listFactorsMock = vi.fn();
const getAAL = vi.fn();
const getSession = vi.fn();
const refreshSession = vi.fn();
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
      getSession: () => getSession(),
      refreshSession: () => refreshSession(),
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
    getSession.mockReset();
    refreshSession.mockReset();
    rpc.mockReset();
    from.mockReset();
    // Default: no active session — disables the AAL2-via-backup fallback
    // in getAALStatus unless a test overrides it.
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    refreshSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it("enrollTotp returns id/qr/secret/uri", async () => {
    enroll.mockResolvedValue({
      data: { id: "f1", type: "totp", totp: { qr_code: "QR", secret: "S", uri: "U" } },
      error: null,
    });
    const res = await enrollTotp({ friendlyName: "My device", issuer: "test-issuer" });
    expect(res).toEqual({ factorId: "f1", qrCode: "QR", secret: "S", uri: "U" });
    expect(enroll).toHaveBeenCalledWith({
      factorType: "totp",
      friendlyName: "My device",
      issuer: "test-issuer",
    });
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

  // AH-12.8 backup-code AAL2 fallback
  it("getAALStatus upgrades AAL1 → AAL2 when app_metadata.aal2_via_backup_until is fresh", async () => {
    getAAL.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal2" }, error: null });
    const futureExpiry = new Date(Date.now() + 25 * 60 * 1000).toISOString();
    getSession.mockResolvedValue({
      data: {
        session: { user: { app_metadata: { aal2_via_backup_until: futureExpiry } } },
      },
      error: null,
    });
    expect(await getAALStatus()).toEqual({ currentLevel: "aal2", nextLevel: "aal2" });
  });

  it("getAALStatus stays AAL1 when app_metadata.aal2_via_backup_until is expired", async () => {
    getAAL.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal2" }, error: null });
    const pastExpiry = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    getSession.mockResolvedValue({
      data: {
        session: { user: { app_metadata: { aal2_via_backup_until: pastExpiry } } },
      },
      error: null,
    });
    expect(await getAALStatus()).toEqual({ currentLevel: "aal1", nextLevel: "aal2" });
  });

  it("consumeBackupCode refreshes the session after a successful RPC", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await consumeBackupCode("ABCD1234-EF567890")).toBe("ok");
    expect(refreshSession).toHaveBeenCalled();
  });

  it("consumeBackupCode surfaces a failed session refresh as refresh_failed", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    refreshSession.mockResolvedValueOnce({ data: { session: null }, error: { message: "boom" } });
    expect(await consumeBackupCode("ABCD1234-EF567890")).toBe("refresh_failed");
    refreshSession.mockRejectedValueOnce(new Error("network down"));
    expect(await consumeBackupCode("ABCD1234-EF567890")).toBe("refresh_failed");
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
    rpc.mockResolvedValue({ data: ["ABCD1234-EF567890", "C0DEC0DE-D00DD00D"], error: null });
    const codes = await generateBackupCodes();
    expect(codes).toEqual(["ABCD1234-EF567890", "C0DEC0DE-D00DD00D"]);
    expect(rpc).toHaveBeenCalledWith("generate_mfa_backup_codes", undefined);
  });

  it("consumeBackupCode returns ok on RPC success", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await consumeBackupCode("ABCD1234-EF567890")).toBe("ok");
    expect(rpc).toHaveBeenCalledWith("consume_mfa_backup_code", { p_code: "ABCD1234-EF567890" });
  });

  it("consumeBackupCode returns invalid on RPC error or non-true data", async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null });
    expect(await consumeBackupCode("BAD")).toBe("invalid");
    rpc.mockResolvedValueOnce({ data: null, error: { message: "x" } });
    expect(await consumeBackupCode("BAD")).toBe("invalid");
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
