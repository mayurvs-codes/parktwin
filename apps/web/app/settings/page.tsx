import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/SettingsView";

export const metadata: Metadata = {
  title: "Settings",
  description: "Configure system properties and user dashboard preferences.",
};

export default function SettingsPage() {
  return <SettingsView />;
}
