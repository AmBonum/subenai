// Shared admin-page render helper for Vitest. AH-11.1b moves admin reads onto
// TanStack Query hooks; specs render the bare page component (no router) so
// they must supply a QueryClientProvider. Each call gets a fresh QueryClient
// so cache state never leaks across tests.

import { ReactElement } from "react";
import { render, type RenderResult, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderAdmin(
  ui: ReactElement,
  client: QueryClient = makeQueryClient(),
): RenderResult {
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

// Flush microtasks so the query's queryFn resolves and the component re-renders
// with the fetched data. Tests can `await flushQueries()` after `renderAdmin`.
export async function flushQueries(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}
