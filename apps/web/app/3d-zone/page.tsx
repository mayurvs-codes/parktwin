import { Zone3DView } from "@/components/3d-zone/Zone3DView";

export const metadata = {
  title: "3D Parking Zone · ParkTwin AI",
  description: "Experimental isolated 3D visualization and vehicle navigation of Carparking-01 B2 parking section.",
};

export default function Zone3DPage() {
  return <Zone3DView />;
}
