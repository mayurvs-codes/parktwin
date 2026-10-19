"""
ParkTwin AI — Bay Entry Detection Configuration
=================================================
Configurable thresholds for discriminating vehicle bay entry from drive-past.
Loads from configs/settings.yaml under `bay_entry:`, with environment variable overrides.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional
import yaml


@dataclass
class BayEntryConfig:
    entry_overlap_min: float = 0.35
    entry_confirm_ms: float = 800.0
    entry_max_speed: float = 5.0
    leave_overlap_max: float = 0.15
    leave_confirm_ms: float = 800.0
    track_loss_timeout_ms: float = 2000.0
    vehicle_footprint_width_m: float = 1.9
    vehicle_footprint_length_m: float = 4.4
    calibration_file: str = "configs/camera_calibration.yaml"

    @classmethod
    def from_settings(cls, settings_path: Optional[str] = None) -> BayEntryConfig:
        """Load configuration from settings.yaml with environment overrides."""
        cfg_dict: Dict[str, Any] = {}
        if not settings_path:
            # Look up default location
            base_dir = Path(__file__).resolve().parents[3]
            candidate = base_dir / "configs" / "settings.yaml"
            if candidate.exists():
                settings_path = str(candidate)

        if settings_path and Path(settings_path).exists():
            try:
                with open(settings_path, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                if isinstance(data, dict) and "bay_entry" in data:
                    cfg_dict = data["bay_entry"]
            except Exception:
                cfg_dict = {}

        # Environment variable overrides
        return cls(
            entry_overlap_min=float(os.getenv("PARKTWIN_ENTRY_OVERLAP_MIN", cfg_dict.get("entry_overlap_min", 0.35))),
            entry_confirm_ms=float(os.getenv("PARKTWIN_ENTRY_CONFIRM_MS", cfg_dict.get("entry_confirm_ms", 800.0))),
            entry_max_speed=float(os.getenv("PARKTWIN_ENTRY_MAX_SPEED", cfg_dict.get("entry_max_speed", 5.0))),
            leave_overlap_max=float(os.getenv("PARKTWIN_LEAVE_OVERLAP_MAX", cfg_dict.get("leave_overlap_max", 0.15))),
            leave_confirm_ms=float(os.getenv("PARKTWIN_LEAVE_CONFIRM_MS", cfg_dict.get("leave_confirm_ms", 800.0))),
            track_loss_timeout_ms=float(os.getenv("PARKTWIN_TRACK_LOSS_TIMEOUT_MS", cfg_dict.get("track_loss_timeout_ms", 2000.0))),
            vehicle_footprint_width_m=float(os.getenv("PARKTWIN_VEHICLE_WIDTH_M", cfg_dict.get("vehicle_footprint_width_m", 1.9))),
            vehicle_footprint_length_m=float(os.getenv("PARKTWIN_VEHICLE_LENGTH_M", cfg_dict.get("vehicle_footprint_length_m", 4.4))),
            calibration_file=os.getenv("PARKTWIN_CALIBRATION_FILE", cfg_dict.get("calibration_file", "configs/camera_calibration.yaml")),
        )
