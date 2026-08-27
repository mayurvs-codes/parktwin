import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KpiCard } from "@/components/dashboard/KpiCard";
import type { KpiItem } from "@/types/dashboard";

describe("components/dashboard/KpiCard.tsx", () => {
  it("renders label and value correctly", () => {
    const item: KpiItem = {
      key: "slots",
      label: "Total Slots",
      value: "50",
      hint: "of 50 slots",
      icon: "slots",
      tone: "default",
    };
    render(<KpiCard item={item} />);

    expect(screen.getByText("Total Slots")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("of 50 slots")).toBeInTheDocument();
  });

  it("applies correct tone class for tone='success'", () => {
    const item: KpiItem = {
      key: "available",
      label: "Available Slots",
      value: "35",
      icon: "available",
      tone: "success",
    };
    const { container } = render(<KpiCard item={item} />);

    const iconSpan = container.querySelector("span[aria-hidden]");
    expect(iconSpan).toBeInTheDocument();
    expect(iconSpan?.className).toContain("text-emerald-600");
  });

  it("applies correct tone class for tone='destructive'", () => {
    const item: KpiItem = {
      key: "occupied",
      label: "Occupied Slots",
      value: "10",
      icon: "occupied",
      tone: "destructive",
    };
    const { container } = render(<KpiCard item={item} />);

    const iconSpan = container.querySelector("span[aria-hidden]");
    expect(iconSpan).toBeInTheDocument();
    expect(iconSpan?.className).toContain("text-destructive");
  });
});
