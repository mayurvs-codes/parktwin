import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface PagePlaceholderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

/**
 * Minimal placeholder for routes that have not yet been built out. Keeps route
 * pages consistent and free of duplicated markup — feature pages replace this.
 * Renders inside the application shell (sidebar + top navigation).
 */
export function PagePlaceholder({ title, description, icon: Icon }: PagePlaceholderProps) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="flex w-full max-w-md flex-col items-center gap-4 p-8 text-center">
        {Icon && <Icon className="h-12 w-12 text-primary" aria-hidden />}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {description ?? `${title} — coming soon.`}
          </p>
        </div>
        <p className="text-xs text-muted-foreground/70">ParkTwin AI · Module 6</p>
      </Card>
    </div>
  );
}
