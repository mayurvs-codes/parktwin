export type BayOccupancyStatus = "OCCUPIED" | "AVAILABLE";

export type VehicleBodyType = "suv" | "sedan" | "hatchback" | "compact";

export interface ParkingBayData {
  id: string; // "SP-01" to "SP-24"
  label: string; // "01" to "24"
  position: [number, number, number];
  rotationY: number;
  width: number;
  length: number;
  status: BayOccupancyStatus;
  verified?: boolean;
  confidence?: string;
  vehicle?: {
    id: string; // "VEH-001" to "VEH-012"
    color: string;
    model: string;
    bodyType?: VehicleBodyType;
  };
}

export type CameraPreset = "PERSPECTIVE" | "TOP";

export type ParkingBay3DData = ParkingBayData;
