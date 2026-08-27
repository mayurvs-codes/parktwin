import { apiGet } from "@/services/api-client";
import type { HealthExtendedDTO, PublicSettingsDTO } from "@/types/settings";

/**
 * Fetch safe public platform settings from the backend (read-only).
 * Does NOT contain secret keys, passwords, or database credentials.
 */
export function fetchPublicSettings(): Promise<PublicSettingsDTO> {
  return apiGet<PublicSettingsDTO>("/settings/public");
}

/**
 * Fetch extended platform health info from the backend.
 */
export function fetchHealthExtended(): Promise<HealthExtendedDTO> {
  return apiGet<HealthExtendedDTO>("/settings/health-extended");
}
