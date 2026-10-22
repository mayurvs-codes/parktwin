import { useSharedDemoState, FOCUSED_ZONE_SPACE_IDS } from "@/store/useSharedDemoState";
import { useUserPortalStore } from "@/store/useUserPortalStore";
import { useVoiceStore } from "@/store/useVoiceStore";
import { getEnv } from "@/utils/env";
import { wrongBayVoiceText } from "@/utils/violationVoice";

export interface WrongBayScenario {
  vehicleId: string;
  plate: string;
  userName: string;
  designatedSpaceId: string;
  actualSpaceId: string;
  /** The driver has no bay yet (User B without reservation, guest not yet assigned): give them one first. */
  needsReservation: boolean;
  reserveAs: "USER_B" | "GUEST";
}

/** Who parks in the wrong bay for the active persona (User A, User B or Guest), or null if no bay is free. */
export function buildWrongBayScenario(): WrongBayScenario | null {
  const shared = useSharedDemoState.getState();
  const persona = shared.activePersona;

  if (persona === "USER_A") {
    return {
      vehicleId: "VEH-001", plate: "KA04MN8049", userName: "Registered User A",
      designatedSpaceId: "SP-07", actualSpaceId: "SP-11", needsReservation: false, reserveAs: "USER_B",
    };
  }

  const isB = persona === "USER_B";
  const spaces = Object.values(shared.spaces);
  const freeIds = FOCUSED_ZONE_SPACE_IDS.filter((id) => shared.spaces[id]?.status === "AVAILABLE");
  const reservedByB = spaces.find((s) => s.status === "RESERVED" && s.user === "Registered User B")?.id ?? null;
  const ownBay = isB ? reservedByB : useUserPortalStore.getState().assignedSpaceId;

  const designatedSpaceId = ownBay ?? freeIds[0];
  if (!designatedSpaceId) return null;
  const actualSpaceId = freeIds.find((id) => id !== designatedSpaceId && id === "SP-11") ?? freeIds.find((id) => id !== designatedSpaceId);
  if (!actualSpaceId) return null;

  return {
    vehicleId: isB ? "VEH-002" : "VEH-003",
    plate: isB ? "KA05BZ2700" : "KA05NB6963",
    userName: isB ? "Registered User B" : "Guest User",
    designatedSpaceId,
    actualSpaceId,
    needsReservation: !ownBay,
    reserveAs: isB ? "USER_B" : "GUEST",
  };
}

/** Speaks the wrong-bay warning and navigation to the designated bay immediately (well under a second). */
export async function speakWrongBayNow(actualBay: string, designatedBay: string, vehicleId = "VEH-001"): Promise<void> {
  const voice = useVoiceStore.getState();
  if (voice.status === "blocked") await voice.enableVoice(); // the click is the user gesture that unlocks speech
  const stamp = Date.now();
  await useVoiceStore.getState().receiveAnnouncement({
    message_id: `VM-LOCAL-${stamp}`,
    event_id: `EV-LOCAL-WRONGBAY-${stamp}`,
    kind: "WRONG_BAY_WARNING",
    text: wrongBayVoiceText(actualBay, designatedBay),
    priority: 100,
    vehicle_id: vehicleId,
    source: "local-demo",
  });
}

async function driveIntoBay(scenario: WrongBayScenario): Promise<void> {
  try {
    await fetch(`${getEnv().apiBase}/violations/demo/drive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        track_id: "9001",
        action: "enter",
        bay_id: scenario.actualSpaceId,
        assigned_bay: scenario.designatedSpaceId,
        vehicle_id: scenario.vehicleId,
      }),
    });
  } catch {
    /* backend unreachable: the local demo state still updates */
  }
}

/**
 * Simulate the active persona's vehicle parking in the wrong bay: updates the shared twin, speaks the warning
 * with directions to the driver's own bay right away, and drives the backend detector. Works for all personas.
 */
export function simulateWrongBay(): boolean {
  const scenario = buildWrongBayScenario();
  if (!scenario) return false;
  const shared = useSharedDemoState.getState();
  if (scenario.needsReservation) shared.reserveSpace(scenario.designatedSpaceId, scenario.reserveAs);
  useSharedDemoState.getState().triggerViolation({
    vehicleId: scenario.vehicleId,
    plate: scenario.plate,
    designatedSpaceId: scenario.designatedSpaceId,
    actualSpaceId: scenario.actualSpaceId,
    userName: scenario.userName,
  });
  void speakWrongBayNow(scenario.actualSpaceId, scenario.designatedSpaceId, scenario.vehicleId);
  void driveIntoBay(scenario);
  return true;
}
