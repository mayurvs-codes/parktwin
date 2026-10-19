import { UserDashboardView } from "@/components/user/UserDashboardView";

export const metadata = {
  title: "Driver Dashboard · ParkTwin AI",
  description: "Live driver parking journey, reservation status, and navigation guidance.",
};

export default function UserDashboardPage() {
  return <UserDashboardView />;
}
