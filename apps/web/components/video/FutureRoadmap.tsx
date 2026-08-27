import { CalendarClock, Check, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FEATURES: Array<{ label: string; done: boolean }> = [
  { label: "Live RTSP Cameras", done: false },
  { label: "IP Cameras", done: false },
  { label: "USB Cameras", done: false },
  { label: "Multi-camera Parallel Processing", done: true },
  { label: "Digital Twin Integration", done: true },
];

export function FutureRoadmap() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarClock className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <CardTitle>System Capabilities & Support</CardTitle>
            <CardDescription>
              Supported and upcoming capabilities for the CCTV Control Center.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
            >
              <span className="flex items-center gap-2 text-sm text-foreground">
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
                ) : (
                  <Check className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                {item.label}
              </span>
              {item.done ? (
                <Badge variant="success" className="shrink-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  Complete
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0">
                  Planned
                </Badge>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
