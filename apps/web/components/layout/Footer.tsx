import { APP_NAME } from "@/utils/constants";

/** Optional footer pinned to the bottom of the content column. */
export function Footer() {
  return (
    <footer className="flex h-12 items-center justify-between border-t border-border bg-card px-6 text-xs text-muted-foreground">
      <span>
        © {new Date().getFullYear()} {APP_NAME}
      </span>
      <span>Smart Parking Intelligence Platform</span>
    </footer>
  );
}
