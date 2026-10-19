import { UserReservationView } from "@/components/user/UserReservationView";

export const metadata = {
  title: "My Reservation · ParkTwin AI",
  description: "Driver reserved parking space details and direct navigation launch.",
};

export default function ReservationPage() {
  return <UserReservationView />;
}
