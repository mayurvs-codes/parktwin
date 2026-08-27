export interface SlotDTO {
  id: string | null;
  slot_id: string;
  camera_id: string;
  zone: string;
  state: "free" | "occupied" | "reserved" | "unknown" | null;
  is_reserved: boolean;
  reserved_for: string | null;
}
