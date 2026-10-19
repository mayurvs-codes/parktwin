import { UserFindParkingView } from "@/components/user/UserFindParkingView";

export const metadata = {
  title: "Find Parking · ParkTwin AI",
  description: "Real-time available spaces and intelligent bay recommendation.",
};

export default function FindParkingPage() {
  return <UserFindParkingView />;
}
