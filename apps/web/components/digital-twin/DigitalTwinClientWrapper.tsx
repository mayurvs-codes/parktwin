"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const DigitalTwinView = dynamic(
  () => import("@/components/digital-twin/DigitalTwinView"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[500px] w-full rounded-lg" />,
  }
);

export function DigitalTwinClientWrapper() {
  return <DigitalTwinView />;
}
