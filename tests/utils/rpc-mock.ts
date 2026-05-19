/**
 * Module-level RPC stub registry for Vitest specs that mock
 * `@/integrations/supabase/client`.
 *
 * Specs that exercise `supabase.rpc("fn", args)` can register a value
 * (or a function of args) up-front:
 *
 *   import { stubRpc } from "@/../tests/utils/rpc-mock";
 *   stubRpc("has_role", true);
 *   stubRpc("get_peer_card", (args) => ({ user_id: args.p_user_id }));
 *
 * The supabase-client mock in their `vi.mock(...)` block calls
 * `getRpcStub(fn)` and resolves it against the passed args:
 *
 *   rpc: async (fn: string, args?: unknown) => {
 *     const stub = getRpcStub(fn);
 *     if (stub === undefined) {
 *       return { data: null, error: { message: `rpc ${fn} not stubbed` } };
 *     }
 *     const value = typeof stub === "function" ? stub(args) : stub;
 *     return { data: value, error: null };
 *   },
 *
 * The `afterEach` in `tests/setup.ts` clears registered stubs so leak
 * across tests is impossible.
 */

type RpcStub = unknown | ((args: unknown) => unknown);

const stubs = new Map<string, RpcStub>();

export function stubRpc(fn: string, value: RpcStub): void {
  stubs.set(fn, value);
}

export function getRpcStub(fn: string): RpcStub | undefined {
  return stubs.get(fn);
}

export function resetRpcStubs(): void {
  stubs.clear();
}
