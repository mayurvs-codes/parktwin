import { UserAnalyticsView } from "@/components/user/UserAnalyticsView";

export const metadata = {
  title: "My Parking Analytics · ParkTwin AI",
  description: "Driver parking session metrics, turnaround time, and journey timeline.",
};

export default function AnalyticsPage() {
  return <UserAnalyticsView />;
}
