import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "ANPR Video Upload",
  description:
    "Upload a parking-lot video and run it through the Vehicle Recognition & ANPR pipeline.",
};

export default function AnprLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
