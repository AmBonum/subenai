import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const rpcSpy = vi.fn(async () => ({ data: "audit-row-id-1", error: null }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (name: string, args: Record<string, unknown>) => rpcSpy(name, args),
    from: () => ({
      select: () => ({
        order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
      }),
    }),
  },
}));

import { useLogAuditEvent } from "@/lib/admin/queries";

function withQueryClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

describe("useLogAuditEvent (AH-11.3)", () => {
  beforeEach(() => {
    rpcSpy.mockClear();
  });

  it("calls the log_audit_event RPC with the expected argument shape", async () => {
    const { result } = renderHook(() => useLogAuditEvent(), { wrapper: withQueryClient() });
    result.current.mutate({
      action: "respondent.pii_access",
      target_type: "respondent",
      target_id: "resp-1",
      pii_access: true,
      details: { note: "Admin otvoril detail" },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rpcSpy).toHaveBeenCalledTimes(1);
    const [name, args] = rpcSpy.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(name).toBe("log_audit_event");
    expect(args.p_action).toBe("respondent.pii_access");
    expect(args.p_target_type).toBe("respondent");
    expect(args.p_target_id).toBe("resp-1");
    expect(args.p_pii_access).toBe(true);
    expect(args.p_details).toEqual({ note: "Admin otvoril detail" });
  });

  it("coerces a string details payload into { note } and defaults pii_access to true", async () => {
    const { result } = renderHook(() => useLogAuditEvent(), { wrapper: withQueryClient() });
    result.current.mutate({
      action: "user_role.update",
      target_type: "user",
      target_id: "uid-1",
      details: "promoted to admin",
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const [, args] = rpcSpy.mock.calls[0] as unknown as [string, Record<string, unknown>];
    expect(args.p_details).toEqual({ note: "promoted to admin" });
    expect(args.p_pii_access).toBe(true);
  });

  it("surfaces a Supabase RPC error to the mutation", async () => {
    rpcSpy.mockResolvedValueOnce({ data: null, error: { message: "not_admin" } });
    const { result } = renderHook(() => useLogAuditEvent(), { wrapper: withQueryClient() });
    result.current.mutate({
      action: "respondent.pii_access",
      target_type: "respondent",
      target_id: "resp-1",
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as { message: string }).message).toBe("not_admin");
  });
});
