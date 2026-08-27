import { getEnv } from "./env";

/** Application display name (sourced from env, with fallback). */
export const APP_NAME = getEnv().appName;

/** Default page size for paginated backend responses. */
export const DEFAULT_PAGE_SIZE = getEnv().defaultPageSize;

/** localStorage keys used by the frontend. */
export const STORAGE_KEYS = {
  theme: "parktwin-theme",
  authToken: "parktwin-auth-token",
  refreshToken: "parktwin-refresh-token",
  user: "parktwin-user",
} as const;
