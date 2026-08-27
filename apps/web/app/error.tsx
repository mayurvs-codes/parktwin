"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/error-state";

/**
 * Route-level error boundary. `reset` re-renders the segment; surfaces a
 * professional, retryable error state instead of a blank crash.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <ErrorState
        title="Something went wrong"
        description="An unexpected error occurred while loading this page. You can try again."
        onRetry={reset}
        retryLabel="Try again"
      />
    </div>
  );
}
