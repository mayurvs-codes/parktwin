import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  /** Pixel size of the spinner. */
  size?: number;
  /** Accessible label announced to screen readers. */
  label?: string;
}

/** Centered, accessible loading indicator. */
export function LoadingSpinner({ className, size = 24, label = "Loading" }: LoadingSpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("inline-flex items-center justify-center text-muted-foreground", className)}
    >
      <Loader2 className="animate-spin" style={{ width: size, height: size }} aria-hidden />
    </span>
  );
}
