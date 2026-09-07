import type { SessionDTO, SlotDTO } from "@/types/parking";

export type TwinSlotStatus = "free" | "occupied" | "reserved" | "violation" | "unknown";
export type VehicleStatus = "entering" | "parked" | "moving" | "exiting" | "exited";
export type CameraRole = "ENTRY" | "EXIT" | "PARKING_LOT" | "PATH_PARKING" | "UNKNOWN";
export type CameraStatus = "online" | "offline" | "unknown";
export type ConfidenceLevel = "VERIFIED" | "HIGH_CONFIDENCE" | "MEDIUM_CONFIDENCE" | "UNVERIFIED" | "NOT_CONFIGURED";
export type AccessPointLocation = "VERIFIED" | "UNVERIFIED";

export interface TwinSlotState {
  slot_id: string;
  zone: string;
  camera_id: string;
  status: TwinSlotStatus;
  license_plate: string | null;
  vehicle_type: string | null;
  occupied_since: string | null;
  duration_seconds: number;
  last_updated: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  orientation?: number;
  confidence?: ConfidenceLevel;
  vehicleAccessible?: boolean;
  physicalId?: string;
  runtimeSlotId?: string;
}

export interface TwinVehicleState {
  id: string;
  prototype_id: string;
  license_plate: string;
  plate_confidence?: number;
  vehicle_type?: string;
  brand?: string;
  model?: string;
  color?: string;
  status: VehicleStatus;
  slot_id?: string | null;
  camera_id?: string | null;
  last_seen?: string | null;
  snapshots?: string[];
  source_evidence?: string | null;
}

export interface TwinCameraState {
  camera_id: string;
  name: string;
  role: CameraRole;
  zone: string;
  status: CameraStatus;
  url: string;
  coverage_slots: string[];
  x: number;
  y: number;
  angle: number;
  fov?: number;
  confidence?: ConfidenceLevel;
  verifiedPosition?: { x: number; y: number } | null;
}

export interface RouteWaypoint {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface RouteData {
  source: string;
  destination: string;
  distance_meters: number;
  path: string[];
  waypoints: RouteWaypoint[];
  directions: string[];
  vehicle_id?: string;
  license_plate?: string;
}

export interface AccessPointState {
  id: string;
  name: string;
  location: AccessPointLocation;
  candidates: Array<{ id: string; label: string; x: number; y: number }>;
  operationalDirections: string[];
  cameraEntry: string;
  cameraExit: string;
  verifiedCoordinates?: { x: number; y: number } | null;
}

export interface ParkingZoneState {
  id: string;
  name: string;
  blocks: string[];
  color: string;
}

export interface LayerVisibility {
  floorPlan: boolean;
  boundary: boolean;
  roads: boolean;
  navNodes: boolean;
  slots: boolean;
  cameras: boolean;
  vehicles: boolean;
  route: boolean;
  labels: boolean;
  forbiddenAreas: boolean;
  pedestrianAreas: boolean;
  zones: boolean;
  accessPoints: boolean;
}

export interface DigitalTwinStore {
  // Slots lookup indexed by slot_id
  slots: Record<string, TwinSlotState>;
  selectedSlotId: string | null;

  // Vehicles lookup indexed by id or prototype_id
  vehicles: Record<string, TwinVehicleState>;
  selectedVehicleId: string | null;

  // Cameras lookup indexed by camera_id
  cameras: Record<string, TwinCameraState>;
  selectedCameraId: string | null;

  // Active calculated route
  activeRoute: RouteData | null;

  // Visual settings & layers
  viewMode: "2d" | "3d";
  showHeatmap: boolean;
  layerVisibility: LayerVisibility;
  isPresentationMode: boolean;
  isConnected: boolean;

  // Floor plan opacity (0.0 to 1.0)
  floorPlanOpacity: number;

  // Access point (single physical gateway)
  accessPoint: AccessPointState;

  // Parking zones
  parkingZones: Array<ParkingZoneState>;

  // Confidence colors
  confidenceColors: Record<string, string>;

  // Actions
  initializeSlots: (slots: SlotDTO[], sessions: SessionDTO[]) => void;
  updateSlot: (slotId: string, delta: Partial<TwinSlotState>) => void;
  selectSlot: (slotId: string | null) => void;

  initializeVehicles: (vehicles: TwinVehicleState[]) => void;
  updateVehicle: (idOrProto: string, delta: Partial<TwinVehicleState>) => void;
  selectVehicle: (vehicleId: string | null) => void;

  initializeCameras: (cameras: TwinCameraState[]) => void;
  updateCameraRole: (cameraId: string, role: CameraRole) => void;
  selectCamera: (cameraId: string | null) => void;

  setActiveRoute: (route: RouteData | null) => void;
  setViewMode: (mode: "2d" | "3d") => void;
  toggleHeatmap: () => void;
  toggleLayer: (layer: keyof LayerVisibility) => void;
  setPresentationMode: (enabled: boolean) => void;
  setFloorPlanOpacity: (opacity: number) => void;
  setConnected: (connected: boolean) => void;
  resetDigitalTwin: () => void;

  // New: Set access point location when verified
  setAccessPointLocation: (location: { x: number; y: number; verified: boolean }) => void;

  // New: Update camera status
  updateCameraStatus: (cameraId: string, status: CameraStatus, verifiedPosition?: { x: number; y: number }) => void;

  // New: Set runtime slot mapping (when verified)
  setRuntimeSlotMapping: (runtimeId: string, physicalId: string) => void;
}