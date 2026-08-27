"use client";

import { User } from "lucide-react";

export function UserMenu() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground bg-muted/30 border border-border/40">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="text-xs font-semibold text-foreground">Admin System</span>
      </div>
    </div>
  );
}
