import { LoadingSpinner } from "@/components/ui/loading-spinner";

/** Global route-loading fallback (Suspense). */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <LoadingSpinner size={32} label="Loading page" />
    </div>
  );
}
