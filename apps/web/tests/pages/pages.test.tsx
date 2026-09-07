import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import DashboardPage from "@/app/dashboard/page";
import ParkingPage from "@/app/parking/page";
import VehiclesPage from "@/app/vehicles/page";
import AnalyticsPage from "@/app/analytics/page";
import ReportsPage from "@/app/reports/page";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

function TestWrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  );
}

describe("Page Smoke Tests", () => {
  it("renders DashboardPage with MSW handlers and expected heading", async () => {
    const spyError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    expect(screen.getByRole("heading", { name: "Dashboard", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Industrial Smart Parking Operating System/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Project Reset/i })).toBeInTheDocument();
    expect(spyError).not.toHaveBeenCalled();
    spyError.mockRestore();
  });

  it("renders ParkingPage with MSW handlers and expected heading", async () => {
    const spyError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <TestWrapper>
        <ParkingPage />
      </TestWrapper>
    );

    expect(screen.getByRole("heading", { name: "Live Parking", level: 1 })).toBeInTheDocument();
    expect(spyError).not.toHaveBeenCalled();
    spyError.mockRestore();
  });

  it("renders VehiclesPage with MSW handlers and expected heading", async () => {
    const spyError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <TestWrapper>
        <VehiclesPage />
      </TestWrapper>
    );

    expect(screen.getByRole("heading", { name: "Vehicles", level: 1 })).toBeInTheDocument();
    expect(spyError).not.toHaveBeenCalled();
    spyError.mockRestore();
  });

  it("renders AnalyticsPage with MSW handlers and expected heading", async () => {
    const spyError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <TestWrapper>
        <AnalyticsPage />
      </TestWrapper>
    );

    expect(screen.getByRole("heading", { name: "Analytics", level: 1 })).toBeInTheDocument();
    expect(spyError).not.toHaveBeenCalled();
    spyError.mockRestore();
  });

  it("renders ReportsPage with MSW handlers and expected heading", async () => {
    const spyError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <TestWrapper>
        <ReportsPage />
      </TestWrapper>
    );

    expect(screen.getByRole("heading", { name: "Reports", level: 1 })).toBeInTheDocument();
    expect(spyError).not.toHaveBeenCalled();
    spyError.mockRestore();
  });
});
