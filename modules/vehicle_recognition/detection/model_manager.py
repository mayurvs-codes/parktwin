"""
ParkTwin AI — Model Manager
=============================
Handles downloading, caching, and switching model weights.
Supports YOLO models (ultralytics hub) and custom weights.

Model *weights* are intentionally kept OUTSIDE the code tree (under models/)
so that swapping a model is a configuration change, not a code change.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from shared.logging import get_logger

logger = get_logger(__name__)

# Known YOLO model names that can be auto-downloaded from ultralytics
_ULTRALYTICS_MODELS = {
    "yolov8n", "yolov8s", "yolov8m", "yolov8l", "yolov8x",
    "yolov8n-cls", "yolov8s-cls", "yolov8m-cls",
    "yolo11n", "yolo11s", "yolo11m", "yolo11l", "yolo11x",
}


class ModelManager:
    """
    Manages model weight files.

    - If a custom weights path exists on disk, use it.
    - If the model name is a known Ultralytics model, download it.
    - Stores all weights in the configured weights directory.
    """

    def __init__(self, weights_root: str = "models") -> None:
        self._root = Path(weights_root)
        self._root.mkdir(parents=True, exist_ok=True)

    def ensure_weights(
        self,
        model_name: str,
        weights_path: str,
        force_download: bool = False,
    ) -> Path:
        """
        Return path to model weights, downloading if necessary.

        Args:
            model_name: e.g., 'yolov8m'
            weights_path: configured path from settings
            force_download: re-download even if file exists

        Returns:
            Path to the weights file
        """
        custom_path = Path(weights_path)

        # 1. Use existing custom weights if available
        if custom_path.exists() and not force_download:
            logger.info(f"Using existing weights: {custom_path}")
            return custom_path

        # 2. Check root weights dir for the model
        root_path = self._root / f"{model_name}.pt"
        if root_path.exists() and not force_download:
            logger.info(f"Using cached weights: {root_path}")
            return root_path

        # 3. Auto-download from Ultralytics hub
        if model_name.lower() in _ULTRALYTICS_MODELS or model_name.endswith(".pt"):
            return self._download_ultralytics(model_name, root_path)

        # 4. Cannot resolve — use default YOLOv8n as fallback
        logger.warning(
            f"Cannot find weights for '{model_name}'. "
            f"Falling back to yolov8n (auto-download)."
        )
        return self._download_ultralytics("yolov8n", self._root / "yolov8n.pt")

    def _download_ultralytics(self, model_name: str, save_path: Path) -> Path:
        """Download an Ultralytics YOLO model."""
        try:
            from ultralytics import YOLO
            logger.info(f"⬇️  Downloading {model_name} from Ultralytics hub...")
            model = YOLO(model_name)                    # triggers auto-download
            # Move to our weights directory
            downloaded = Path(model.ckpt_path)
            if downloaded != save_path:
                save_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(str(downloaded), str(save_path))
            logger.info(f"✅ Weights saved to {save_path}")
            return save_path
        except Exception as e:
            logger.error(f"Failed to download {model_name}: {e}")
            raise

    def list_available(self) -> list[str]:
        """List all .pt files in the weights directory."""
        return [p.stem for p in self._root.rglob("*.pt")]
