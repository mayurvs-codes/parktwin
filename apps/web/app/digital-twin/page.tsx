import { DigitalTwinClientWrapper } from "@/components/digital-twin/DigitalTwinClientWrapper";

export const metadata = {
  title: "Digital Twin — ParkTwin AI",
  description: "Real-time 2D/3D interactive virtual replica of the parking facility.",
};

export default function DigitalTwinPage() {
  return <DigitalTwinClientWrapper />;
}
