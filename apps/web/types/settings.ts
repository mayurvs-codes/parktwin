export interface AppSettingsDTO {
  name: string;
  version: string;
  environment: string;
  debug: boolean;
}

export interface ApiSettingsDTO {
  host: string;
  port: number;
  cors_origins: string[];
}

export interface ModelsSettingsDTO {
  device: string;
  confidence_threshold: number;
  tracking_algorithms: string[];
}

export interface ParkingSettingsDTO {
  max_session_duration_hours: number;
  violation_threshold_minutes: number;
  camera_ids: string[];
}

export interface LoggingSettingsDTO {
  level: string;
  format: string;
}

export interface PublicSettingsDTO {
  app: AppSettingsDTO;
  api: ApiSettingsDTO;
  models: ModelsSettingsDTO;
  parking: ParkingSettingsDTO;
  logging: LoggingSettingsDTO;
}

export interface HealthExtendedDTO {
  status: string;
  version: string;
  environment: string;
  device: string;
  camera_count: number;
  database: string;
  active_cameras: number;
  pipeline_ready: boolean;
}
