"use client";

import React from "react";
import { FacilityMap } from "@/components/digital-twin/FacilityMap";
import { ACCESS_POINT_B2 } from "@/components/digital-twin/demoScenarioData";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useSharedDemoState } from "@/store/useSharedDemoState";
import { RouteLayer } from "./RouteLayer";
import { VehicleMarker } from "./VehicleMarker";
import { DestinationMarker } from "./DestinationMarker";

export interface DigitalTwinMapProps {
  onSlotSelect?: (slotId: string) => void;
  hideAdminControls?: boolean;
  showAdminVehicles?: boolean;
  showAdminRoutes?: boolean;
  highlightSlotId?: string | null;
}

/**
 * DigitalTwinMap: Driver-facing and Admin view of the authoritative ParkTwin 2D Digital Twin.
 * Genuinely reuses FacilityMap geometry, bays, cameras, and coordinate space (1472 x 1508)
 * instead of duplicating SVG markup, projecting driver navigation overlays as SVG children.
 */
export function DigitalTwinMap({
  onSlotSelect,
  hideAdminControls = true,
  showAdminVehicles = true,
  showAdminRoutes = false,
  highlightSlotId,
}: DigitalTwinMapProps = {}) {
  // Shared Demo State (Authoritative Violation & Persona)
  const sharedViolation = useSharedDemoState((s) => s.violation);

  // Driver Journey State
  const rawAssignedSpaceId = useUserPortalStore((s) => s.assignedSpaceId);
  const assignedSpaceId = highlightSlotId !== undefined ? highlightSlotId : rawAssignedSpaceId;
  const assignedSpace = useUserPortalStore((s) => s.assignedSpace);
  const currentRoute = useUserPortalStore((s) => s.currentRoute);
  const vehiclePosition = useUserPortalStore((s) => s.vehiclePosition);
  const vehicleHeading = useUserPortalStore((s) => s.vehicleHeading);
  const navigationMode = useUserPortalStore((s) => s.navigationMode);
  const journeyStep = useUserPortalStore((s) => s.journeyStep);
  const activeVehicleId = useUserPortalStore((s) => s.activeVehicleId);
  const vehicleDef = useUserPortalStore((s) => s.vehicleDef);

  const isNavigating = journeyStep === "NAVIGATING_TO_SPACE" || journeyStep === "NAVIGATING_TO_EXIT";
  const isExitMode = navigationMode === "SPACE_TO_EXIT" || journeyStep === "NAVIGATING_TO_EXIT" || journeyStep === "AT_GATEWAY";
  const isParked = journeyStep === "PARKED" || journeyStep === "PARKING_SESSION";
  const isViolation = Boolean(sharedViolation?.active && sharedViolation.vehicleId === activeVehicleId);

  // Target destination coordinates
  const destinationCoords: [number, number] | null = isExitMode
    ? [ACCESS_POINT_B2.x, ACCESS_POINT_B2.y]
    : assignedSpace
    ? [assignedSpace.x, assignedSpace.y]
    : null;

  // Driver vehicle marker should only show when vehicle is not canonically parked inside a stall
  // and not actively flagged as parked in violation (where FacilityMap already renders the vehicle).
  const showDriverVehicle = vehiclePosition && !isParked && !isViolation;

  return (
    <FacilityMap
      highlightSlotId={assignedSpaceId}
      hideAdminControls={hideAdminControls}
      showAdminVehicles={showAdminVehicles}
      showAdminRoutes={showAdminRoutes}
      onSlotSelect={onSlotSelect}
    >
      {/* ── Driver Overlay 1: Active Navigation Route Layer with Directional Arrows ── */}
      {currentRoute && currentRoute.points.length > 1 && (
        <RouteLayer
          points={currentRoute.points}
          color={isExitMode ? "#f59e0b" : "#38bdf8"}
          showArrows={true}
        />
      )}

      {/* ── Driver Overlay 2: Target Destination Marker ── */}
      {destinationCoords && (
        <DestinationMarker
          x={destinationCoords[0]}
          y={destinationCoords[1]}
          label={isExitMode ? "ACCESS_POINT_B2" : (assignedSpace?.id || "SP-07")}
          type={isExitMode ? "gateway" : "parking_space"}
          zone={assignedSpace?.zone}
        />
      )}

      {/* ── Driver Overlay 3: Driver Vehicle Marker ("YOU") ── */}
      {showDriverVehicle && (
        <VehicleMarker
          x={vehiclePosition[0]}
          y={vehiclePosition[1]}
          heading={vehicleHeading}
          color={vehicleDef.scenario.color}
          vehicleId={activeVehicleId}
          isMoving={isNavigating}
        />
      )}
    </FacilityMap>
  );
}
