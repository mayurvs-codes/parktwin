"""
ParkTwin AI — Model Weight Downloader & Bootstrapper
======================================================
Ensures all required AI weights are downloaded and placed into the proper
directory structure under `models/`.

Usage:
    python scripts/download_models.py [--force]
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
import urllib.request
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parents[1]
MODELS_DIR = BASE_DIR / "models"
VEHICLE_DET_DIR = MODELS_DIR / "vehicle_detection"
PLATE_DET_DIR = MODELS_DIR / "plate_detection"
CLASSIFICATION_DIR = MODELS_DIR / "vehicle_classification"
OCR_DIR = MODELS_DIR / "ocr"

# Model URLs (public weights)
MODEL_SOURCES = {
    "yolov8m": {
        "dest": VEHICLE_DET_DIR / "yolov8m.pt",
        "url": "https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8m.pt",
    },
    "yolov8n": {
        "dest": VEHICLE_DET_DIR / "yolov8n.pt",
        "url": "https://github.com/ultralytics/assets/releases/download/v8.2.0/yolov8n.pt",
    },
    "plate_detector": {
        "dest": PLATE_DET_DIR / "plate_detector.pt",
        # HuggingFace pre-trained YOLOv8 license plate detector
        "url": "https://huggingface.co/keremberke/yolov8n-license-plate-detection/resolve/main/best.pt",
    },
}


def download_file(url: str, dest: Path, force: bool = False) -> bool:
    """Download a file with progress reporting."""
    if dest.exists() and not force:
        print(f"[OK] Model already exists: {dest} ({dest.stat().st_size / (1024*1024):.1f} MB)")
        return True

    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp_dest = dest.with_suffix(".tmp")

    print(f"[DOWNLOADING] {url} -> {dest}...")
    try:
        urllib.request.urlretrieve(url, tmp_dest)
        if tmp_dest.exists() and tmp_dest.stat().st_size > 1024:  # At least 1KB
            tmp_dest.replace(dest)
            print(f"[SUCCESS] Saved: {dest} ({dest.stat().st_size / (1024*1024):.1f} MB)")
            return True
        else:
            print(f"[ERROR] Downloaded file is too small or invalid: {tmp_dest}")
            if tmp_dest.exists():
                tmp_dest.unlink()
            return False
    except Exception as e:
        print(f"[WARN] Failed to download {url}: {e}")
        if tmp_dest.exists():
            tmp_dest.unlink()
        return False


def copy_from_root_if_available():
    """Copy root models/yolov8*.pt to models/vehicle_detection/ if present."""
    for name in ["yolov8m.pt", "yolov8n.pt"]:
        src = MODELS_DIR / name
        dest = VEHICLE_DET_DIR / name
        if src.exists() and not dest.exists():
            print(f"[COPY] Copying local {src} -> {dest}")
            shutil.copy2(src, dest)


def ensure_all_models(force: bool = False):
    """Ensure all subdirectories exist and all models are downloaded."""
    for d in [VEHICLE_DET_DIR, PLATE_DET_DIR, CLASSIFICATION_DIR, OCR_DIR]:
        d.mkdir(parents=True, exist_ok=True)

    copy_from_root_if_available()

    for name, info in MODEL_SOURCES.items():
        dest = info["dest"]
        url = info["url"]
        if not dest.exists() or force:
            download_file(url, dest, force=force)

    print("\n[SUMMARY] Current model inventory:")
    for pt_file in sorted(MODELS_DIR.rglob("*.pt")):
        rel = pt_file.relative_to(BASE_DIR)
        size_mb = pt_file.stat().st_size / (1024 * 1024)
        print(f"  - {rel} ({size_mb:.2f} MB)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download ParkTwin AI Model Weights")
    parser.add_argument("--force", action="store_true", help="Force re-download existing files")
    args = parser.parse_args()
    ensure_all_models(force=args.force)
