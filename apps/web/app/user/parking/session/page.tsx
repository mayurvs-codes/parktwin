import { UserSessionView } from "@/components/user/UserSessionView";

export const metadata = {
  title: "Parking Session · ParkTwin AI",
  description: "Active driver parking session, live timer, and exit routing.",
};

export default function ParkingSessionPage() {
  return <UserSessionView />;
}
