import { create } from "zustand";
import type { SessionDTO, SlotDTO } from "@/types/parking";
import type {
  CameraRole,
  CameraStatus,
  DigitalTwinStore,
  LayerVisibility,
  RouteData,
  TwinCameraState,
  TwinSlotState,
  TwinSlotStatus,
  TwinVehicleState,
  ConfidenceLevel,
  AccessPointLocation,
  AccessPointState,
  ParkingZoneState,
} from "@/types/digitalTwin";
import {
  PHYSICAL_PARKING_SPACES,
  RUNTIME_TO_PHYSICAL_MAP,
  CANONICAL_CAMERAS,
  ACCESS_POINT_B2,
  PARKING_ZONES,
  CONFIDENCE_COLORS,
} from "@/components/digital-twin/twinConfig";

function getCameraForZone(zone: string): string {
  switch (zone) {
    case "Zone A":
      return "CAM-02";
    case "Zone B":
    case "Zone C":
    case "Zone D":
    case "Zone E":
      return "CAM-03";
    default:
      return "CAM-01";
  }
}

function toTwinStatus(slot: SlotDTO): TwinSlotStatus {
  if (slot.is_reserved) return "reserved";
  switch (slot.state) {
    case "free":
      return "free";
    case "occupied":
      return "occupied";
    case "reserved":
      return "reserved";
    case "unknown":
    default:
      return "unknown";
  }
}

function buildInitialSlots(): Record<string, TwinSlotState> {
  const nowIso = new Date().toISOString();
  const initial: Record<string, TwinSlotState> = {};

  for (const space of PHYSICAL_PARKING_SPACES) {
    const anchor = space.pdfCenter;
    initial[space.id] = {
      slot_id: space.id,
      zone: space.zone,
      camera_id: getCameraForZone(space.zone),
      status: "unknown",
      license_plate: null,
      vehicle_type: null,
      occupied_since: null,
      duration_seconds: 0,
      last_updated: nowIso,
      x: anchor.x - space.width / 2,
      y: anchor.y - space.height / 2,
      width: space.width,
      height: space.height,
      orientation: space.orientationDegrees,
      confidence: space.confidence,
      vehicleAccessible: space.vehicleAccessible,
      physicalId: space.id,
      runtimeSlotId: undefined,
    };
  }

  for (const [runtimeId, physicalId] of Object.entries(RUNTIME_TO_PHYSICAL_MAP)) {
    const phys = PHYSICAL_PARKING_SPACES.find((p) => p.id === physicalId);
    if (phys) {
      initial[runtimeId] = {
        slot_id: runtimeId,
        zone: phys.zone,
        camera_id: getCameraForZone(phys.zone),
        status: "free",
        license_plate: null,
        vehicle_type: null,
        occupied_since: null,
        duration_seconds: 0,
        last_updated: nowIso,
        x: phys.pdfCenter.x - phys.width / 2,
        y: phys.pdfCenter.y - phys.height / 2,
        width: phys.width,
        height: phys.height,
        orientation: phys.orientationDegrees,
        confidence: phys.confidence,
        vehicleAccessible: phys.vehicleAccessible,
        physicalId: phys.id,
        runtimeSlotId: runtimeId,
      };
    }
  }

  return initial;
}

function buildInitialCameras(): Record<string, TwinCameraState> {
  const cams: Record<string, TwinCameraState> = {};
  for (const cam of CANONICAL_CAMERAS) {
    cams[cam.id] = {
      camera_id: cam.id,
      name: cam.id,
      role: cam.role,
      zone: "facility",
      status: cam.status === "CONFIGURED" ? "online" : "offline",
      url: cam.source ?? "",
      coverage_slots: [],
      x: cam.verifiedPosition?.x ?? 0,
      y: cam.verifiedPosition?.y ?? 0,
      angle: 0,
      fov: 65,
      confidence: cam.status === "CONFIGURED" ? "VERIFIED" : "NOT_CONFIGURED",
      verifiedPosition: cam.verifiedPosition,
    };
  }
  return cams;
}

const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  floorPlan: true,
  boundary: true,
  roads: true,
  navNodes: false,
  slots: true,
  cameras: true,
  vehicles: true,
  route: true,
  labels: true,
  forbiddenAreas: true,
  pedestrianAreas: true,
  zones: true,
  accessPoints: true,
};

const store = create<DigitalTwinStore>()((set) => ({
  slots: buildInitialSlots(),
  selectedSlotId: null,
  vehicles: {},
  selectedVehicleId: null,
  cameras: buildInitialCameras(),
  selectedCameraId: null,
  activeRoute: null,
  viewMode: "2d",
  showHeatmap: false,
  layerVisibility: DEFAULT_LAYER_VISIBILITY,
  isPresentationMode: false,
  floorPlanOpacity: 0.85,
  isConnected: false,
  accessPoint: {
    id: ACCESS_POINT_B2.id,
    name: ACCESS_POINT_B2.name,
    location: ACCESS_POINT_B2.location,
    candidates: [...ACCESS_POINT_B2.candidates],
    operationalDirections: [...ACCESS_POINT_B2.operationalDirections],
    cameraEntry: ACCESS_POINT_B2.cameraEntry,
    cameraExit: ACCESS_POINT_B2.cameraExit,
  },
  parkingZones: PARKING_ZONES.map(z => ({ ...z, blocks: [...z.blocks] })),
  confidenceColors: CONFIDENCE_COLORS,
  initializeSlots: (slots: SlotDTO[], sessions: SessionDTO[]) => {
    const activeBySlot = new Map<string, SessionDTO>();
    for (const session of sessions) {
      if (session.is_active && session.slot_id) {
        activeBySlot.set(session.slot_id.toUpperCase(), session);
      }
    }
    const nowIso = new Date().toISOString();
    const nextSlots: Record<string, TwinSlotState> = buildInitialSlots();
    for (const slot of slots) {
      if (!slot.slot_id) continue;
      const key = slot.slot_id.toUpperCase();
      const session = activeBySlot.get(key) ?? null;
      const computedStatus = session ? "occupied" : toTwinStatus(slot);
      const physicalId = RUNTIME_TO_PHYSICAL_MAP[key];
      const phys = physicalId ? PHYSICAL_PARKING_SPACES.find((p) => p.id === physicalId) : null;
      nextSlots[key] = {
        slot_id: key,
        zone: slot.zone || (phys?.zone ?? "Unknown"),
        camera_id: slot.camera_id || getCameraForZone(phys?.zone ?? "Unknown"),
        status: computedStatus,
        license_plate: session?.license_plate ?? null,
        vehicle_type: null,
        occupied_since: session?.entry_time ?? null,
        duration_seconds: session?.duration_seconds ?? 0,
        last_updated: nowIso,
        x: phys ? phys.pdfCenter.x - phys.width / 2 : 0,
        y: phys ? phys.pdfCenter.y - phys.height / 2 : 0,
        width: phys?.width ?? 44,
        height: phys?.height ?? 68,
        orientation: phys?.orientationDegrees ?? 180,
        confidence: phys?.confidence ?? "UNVERIFIED",
        vehicleAccessible: phys?.vehicleAccessible ?? true,
        physicalId: phys?.id,
        runtimeSlotId: key,
      };
    }
    set({ slots: nextSlots });
  },
  updateSlot: (slotId: string, delta: Partial<TwinSlotState>) => {
    set((state) => {
      const key = slotId.toUpperCase();
      const existing = state.slots[key] || {
        slot_id: key,
        zone: "Unknown",
        camera_id: "CAM-01",
        status: "free",
        license_plate: null,
        vehicle_type: null,
        occupied_since: null,
        duration_seconds: 0,
        last_updated: new Date().toISOString(),
        x: 0,
        y: 0,
        width: 44,
        height: 68,
        orientation: 180,
        confidence: "UNVERIFIED",
        vehicleAccessible: false,
        physicalId: "",
        runtimeSlotId: undefined,
      };
      return {
        slots: {
          ...state.slots,
          [key]: {
            ...existing,
            ...delta,
            slot_id: key,
            last_updated: delta.last_updated ?? new Date().toISOString(),
          },
        },
      };
    });
  },
  selectSlot: (slotId: string | null) =>
    set({
      selectedSlotId: slotId,
      selectedVehicleId: slotId ? null : null,
    }),
  initializeVehicles: (vehicleList: TwinVehicleState[]) => {
    const vMap: Record<string, TwinVehicleState> = {};
    for (const v of vehicleList) {
      const id = v.prototype_id || v.id || v.license_plate;
      vMap[id] = v;
      if (v.license_plate) vMap[v.license_plate] = v;
      if (v.id) vMap[v.id] = v;
    }
    set({ vehicles: vMap });
  },
  updateVehicle: (idOrProto: string, delta: Partial<TwinVehicleState>) => {
    set((state) => {
      const existing = state.vehicles[idOrProto] || state.vehicles[idOrProto.toUpperCase()] || {
        id: idOrProto,
        prototype_id: idOrProto,
        license_plate: idOrProto,
        status: "entering" as const,
      };
      const updated: TwinVehicleState = { ...existing, ...delta };
      const nextVehicles = { ...state.vehicles, [idOrProto]: updated };
      if (updated.prototype_id) nextVehicles[updated.prototype_id] = updated;
      if (updated.license_plate) nextVehicles[updated.license_plate] = updated;
      if (updated.id) nextVehicles[updated.id] = updated;
      return { vehicles: nextVehicles };
    });
  },
  selectVehicle: (vehicleId: string | null) =>
    set({
      selectedVehicleId: vehicleId,
      selectedCameraId: null,
    }),
  initializeCameras: (cameraList: TwinCameraState[]) => {
    const cMap: Record<string, TwinCameraState> = buildInitialCameras();
    for (const c of cameraList) {
      const existing = cMap[c.camera_id];
      cMap[c.camera_id] = { ...existing, ...c, role: c.role || existing?.role || "UNKNOWN" };
    }
    set({ cameras: cMap });
  },
  updateCameraRole: (cameraId: string, role: CameraRole) => {
    set((state) => {
      const existing = state.cameras[cameraId];
      if (!existing) return state;
      return { cameras: { ...state.cameras, [cameraId]: { ...existing, role } } };
    });
  },
  selectCamera: (cameraId: string | null) =>
    set({ selectedCameraId: cameraId, selectedVehicleId: null }),
  setActiveRoute: (route: RouteData | null) => set({ activeRoute: route }),
  setViewMode: (mode: "2d" | "3d") => set({ viewMode: mode }),
  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
  toggleLayer: (layer: keyof LayerVisibility) =>
    set((state) => ({
      layerVisibility: { ...state.layerVisibility, [layer]: !state.layerVisibility[layer] },
    })),
  setPresentationMode: (enabled: boolean) => set({ isPresentationMode: enabled }),
  setFloorPlanOpacity: (opacity: number) => set({ floorPlanOpacity: opacity }),
  setConnected: (connected: boolean) => set({ isConnected: connected }),
  resetDigitalTwin: () =>
    set(() => ({
      slots: buildInitialSlots(),
      vehicles: {},
      cameras: buildInitialCameras(),
      selectedSlotId: null,
      selectedVehicleId: null,
      selectedCameraId: null,
      activeRoute: null,
      viewMode: "2d",
      showHeatmap: false,
      isPresentationMode: false,
      isConnected: false,
    })),
  setAccessPointLocation: (location: { x: number; y: number; verified: boolean }) =>
    set((state) => ({
      accessPoint: {
        ...state.accessPoint,
        location: location.verified ? "VERIFIED" : "UNVERIFIED",
        verifiedCoordinates: location.verified ? { x: location.x, y: location.y } : null,
      },
    })),
  updateCameraStatus: (cameraId: string, status: CameraStatus, verifiedPosition?: { x: number; y: number }) =>
    set((state) => {
      const existing = state.cameras[cameraId];
      if (!existing) return state;
      return {
        cameras: {
          ...state.cameras,
          [cameraId]: {
            ...existing,
            status,
            verifiedPosition: verifiedPosition ?? existing.verifiedPosition,
            confidence: status === "online" ? "VERIFIED" : existing.confidence,
          },
        },
      };
    }),
  setRuntimeSlotMapping: (runtimeId: string, physicalId: string) =>
    set((state) => {
      const slot = state.slots[runtimeId];
      if (!slot) return state;
      return {
        slots: {
          ...state.slots,
          [runtimeId]: { ...slot, physicalId, runtimeSlotId: runtimeId },
        },
      };
    }),
}));;

export const useDigitalTwinStore = store;

if (typeof window !== "undefined") {
  (window as any).__useDigitalTwinStore = store;
}