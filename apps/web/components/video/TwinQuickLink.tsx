"use client";

import Link from "next/link";
import { ArrowRight, Layers3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/utils/routes";

interface TwinQuickLinkProps {
  show: boolean;
}

export function TwinQuickLink({ show }: TwinQuickLinkProps) {
  if (!show) return null;

  return (
    <Card className="border-l-4 border-l-primary bg-primary/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Layers3 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h4 className="text-sm font-semibold tracking-tight text-foreground">
              Digital Twin Updated
            </h4>
            <p className="text-xs text-muted-foreground">
              Parking slot states have been refreshed from the latest video processing run. View the live virtual replica to see current occupancy.
            </p>
          </div>
        </div>

        <Link
          href={ROUTES.digitalTwin}
          className={buttonVariants({ variant: "default", size: "sm", className: "shrink-0" })}
        >
          View Digital Twin
          <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}
