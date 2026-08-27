import { QueryClient } from "@tanstack/react-query";

/**
 * Factory for the application-wide TanStack Query client.
 * Centralizes sensible defaults so feature hooks stay thin.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
