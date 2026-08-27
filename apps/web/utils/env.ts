/**
 * Environment configuration.
 *
 * All values are read from `NEXT_PUBLIC_*` variables (inlined at build time so
 * they are available in the browser). See `.env.example` for the full list.
 */

export interface AppEnv {
  /** Base URL of the ParkTwin backend (FastAPI). */
  apiBase: string;
  /** Human-readable application name. */
  appName: string;
  /** Axios request timeout in milliseconds. */
  apiTimeout: number;
  /** Default page size for paginated backend responses. */
  defaultPageSize: number;
}

export function getEnv(): AppEnv {
  return {
    apiBase: process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000",
    appName: process.env.NEXT_PUBLIC_APP_NAME ?? "ParkTwin AI",
    apiTimeout: Number(process.env.NEXT_PUBLIC_API_TIMEOUT ?? 15_000),
    defaultPageSize: Number(process.env.NEXT_PUBLIC_DEFAULT_PAGE_SIZE ?? 20),
  };
}
