import { redirect } from "next/navigation";
import { ROUTES } from "@/utils/routes";

/**
 * The Dashboard is the operational landing view (Module 6 – Phase C), so the
 * site root forwards there. Keep this thin — no logic beyond the redirect.
 */
export default function HomePage() {
  redirect(ROUTES.dashboard);
}
