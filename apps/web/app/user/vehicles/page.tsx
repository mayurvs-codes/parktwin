import { UserVehiclesView } from "@/components/user/UserVehiclesView";

export const metadata = {
  title: "My Vehicles · ParkTwin AI",
  description: "CCTV-grounded vehicle fleet management and demo scenario assignments.",
};

export default function VehiclesPage() {
  return <UserVehiclesView />;
}
