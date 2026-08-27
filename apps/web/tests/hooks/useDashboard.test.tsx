import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { useOccupancy } from "@/hooks/useDashboard";
import { server } from "../mocks/server";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("hooks/useDashboard.ts", () => {
  it("on success: isLoading=false, data contains occupancy fields", async () => {
    const { result } = renderHook(() => useOccupancy(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isSuccess).toBe(true);
    expect(result.current.data?.total_slots).toBe(50);
    expect(result.current.data?.free).toBe(35);
    expect(result.current.data?.occupied).toBe(10);
    expect(result.current.data?.occupancy_rate).toBe(20.0);
  });

  it("on MSW 500 error: isError=true", async () => {
    server.use(
      http.get("*/integration/occupancy", () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const { result } = renderHook(() => useOccupancy(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
