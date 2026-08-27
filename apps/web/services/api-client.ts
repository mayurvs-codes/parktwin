import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { getEnv } from "@/utils/env";
import { STORAGE_KEYS } from "@/utils/constants";

/**
 * Centralized HTTP client for the ParkTwin backend.
 *
 * Built on Axios. The integration gateway (`/integration/*`) is the preferred
 * external surface (see PROJECT_MEMORY.md §7); feature services compose on top
 * of the typed helpers below. No business logic lives here — only transport.
 */
const env = getEnv();

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBase,
  timeout: env.apiTimeout,
  headers: { "Content-Type": "application/json" },
});


apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem(STORAGE_KEYS.authToken) || "dev_admin_token";
      if (config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/** GET helper — returns the response body typed as `T`. */
export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res: AxiosResponse<T> = await apiClient.get(url, config);
  return res.data;
}

/** POST helper. */
export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const res: AxiosResponse<T> = await apiClient.post(url, body, config);
  return res.data;
}

/** PUT helper. */
export async function apiPut<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const res: AxiosResponse<T> = await apiClient.put(url, body, config);
  return res.data;
}

/** DELETE helper. */
export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res: AxiosResponse<T> = await apiClient.delete(url, config);
  return res.data;
}
