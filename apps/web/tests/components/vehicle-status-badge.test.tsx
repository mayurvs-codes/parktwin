import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VehicleStatusBadge } from "@/components/vehicles/VehicleStatusBadge";

describe("components/vehicles/VehicleStatusBadge.tsx", () => {
  it("renders correct text for 'parked' status", () => {
    render(<VehicleStatusBadge status="parked" />);
    expect(screen.getByText("Parked")).toBeInTheDocument();
  });

  it("renders correct text for 'exited' status", () => {
    render(<VehicleStatusBadge status="exited" />);
    expect(screen.getByText("Exited")).toBeInTheDocument();
  });

  it("renders correct text for 'unknown' status", () => {
    render(<VehicleStatusBadge status="unknown" />);
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });
});
