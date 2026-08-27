/**
 * Shared, domain-agnostic TypeScript types for the frontend foundation.
 * Feature-specific types will live alongside their modules.
 */

export type Theme = "light" | "dark" | "system";

/** Envelope some backend responses may use; kept for forward-compatible typing. */
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

/** Generic pagination shape used by list endpoints. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
