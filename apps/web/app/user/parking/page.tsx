"use client";

import React from "react";
import { useSharedDemoState } from "@/store/useSharedDemoState";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { UserReservationView } from "@/components/user/UserReservationView";
import { UserFindParkingView } from "@/components/user/UserFindParkingView";

export default function UserParkingPage() {
  const activePersona = useSharedDemoState((s) => s.activePersona);
  const focusedSpaces = useSharedDemoState((s) => s.spaces);
  const activeVehicleId = useUserPortalStore((s) => s.activeVehicleId);
  const vehicleDef = useUserPortalStore((s) => s.vehicleDef);
  const assignedSpaceId = useUserPortalStore((s) => s.assignedSpaceId);

  // Check if User B has reserved a space in the focused zone
  const userBReserved = Object.values(focusedSpaces).some(
    (s) => s.status === "RESERVED" && s.user === "Registered User B"
  );

  // Gate based on persona & reservation status:
  // 1. User A: show designated space SP-07 info
  if (activePersona === "USER_A" || activeVehicleId === "VEH-001") {
    return <UserReservationView />;
  }

  // 2. User B:
  //    - If reserved (e.g. SP-14): show UserReservationView
  //    - If no reservation: show UserFindParkingView
  if (activePersona === "USER_B" || activeVehicleId === "VEH-002") {
    if (userBReserved || assignedSpaceId || vehicleDef.scenario.hasReservation) {
      return <UserReservationView />;
    }
    return <UserFindParkingView />;
  }

  // 3. Guest: unregistered visitor -> show available spaces only
  return <UserFindParkingView />;
}
