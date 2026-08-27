import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/utils/routes";

/** Global 404 page. */
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description="The page you are looking for doesn’t exist or may have been moved."
        action={
          <Link href={ROUTES.dashboard} className={buttonVariants({ variant: "default" })}>
            Back to Dashboard
          </Link>
        }
      />
    </div>
  );
}
