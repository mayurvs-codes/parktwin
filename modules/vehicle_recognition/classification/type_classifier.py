"""
ParkTwin AI — Vehicle Type Classifier
=======================================
Classifies vehicle body type using YOLO class labels
plus a fine-grained ResNet-based classifier.

Supported types:
  SUV, Sedan, Hatchback, Convertible, Coupe, Pickup, Van,
  Electric Vehicle, Luxury Vehicle, Bus, Motorcycle, Scooter,
  Auto Rickshaw, Delivery Vehicle, Emergency Vehicle, Truck
"""

from __future__ import annotations

from typing import Dict, Optional, Tuple

import numpy as np

from backend.core.config import get_settings
from shared.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()

# ─── YOLO class → vehicle type mapping ───────────────────────────────────────
_YOLO_TYPE_MAP: Dict[str, str] = {
    "car":               "Sedan",
    "motorcycle":        "Motorcycle",
    "bus":               "Bus",
    "truck":             "Truck",
    "van":               "Van",
    "suv":               "SUV",
    "hatchback":         "Hatchback",
    "sedan":             "Sedan",
    "pickup_truck":      "Pickup Truck",
    "mini_truck":        "Mini Truck",
    "electric_car":      "Electric Car",
    "school_bus":        "School Bus",
    "auto_rickshaw":     "Auto Rickshaw",
    "scooter":           "Scooter",
    "delivery_vehicle":  "Delivery Vehicle",
    "emergency_vehicle": "Emergency Vehicle",
    "mpv":               "MPV",
    "muv":               "MUV",
}

# ─── Physical dimension heuristics (bbox aspect ratio) ────────────────────────
def _aspect_to_type(aspect_ratio: float, yolo_class: str) -> str:
    """Use bounding box aspect ratio to refine classification when fine-grained model is unavailable."""
    base = _YOLO_TYPE_MAP.get(yolo_class.lower(), "Car")
    if base in {"Sedan", "Car"}:
        if aspect_ratio > 2.2:
            return "Sedan"
        elif aspect_ratio > 1.8:
            return "Hatchback"
        else:
            return "SUV"
    return base


class VehicleTypeClassifier:
    """
    Vehicle type / body-style classifier.

    Strategy (in order):
      1. Pre-trained Deep Learning Model (MobileNetV3 / ResNet) with vehicle category mapping
      2. Custom fine-tuned weights if available
      3. YOLO class name mapping
      4. Aspect-ratio physical dimension heuristic
    """

    # ImageNet category index -> ParkTwin standard vehicle type
    IMAGENET_VEHICLE_MAP: Dict[int, str] = {
        407: "Emergency Vehicle",  # ambulance
        436: "Sedan",              # beach wagon / station wagon
        468: "Sedan",              # cab / taxi
        511: "Convertible",        # convertible
        555: "Emergency Vehicle",  # fire engine
        569: "Truck",              # garbage truck
        575: "Golf Cart",          # golfcart
        609: "SUV",                # jeep / landrover
        627: "Sedan",              # limousine
        654: "Bus",                # minibus
        656: "Van",                # minivan / mpv
        665: "Scooter",            # moped
        670: "Scooter",            # motor scooter
        671: "Motorcycle",         # mountain bike / bicycle
        675: "Van",                # moving van
        705: "Sedan",              # passenger car
        717: "Pickup Truck",       # pickup / pickup truck
        734: "Emergency Vehicle",  # police van
        751: "Coupe",              # racer / race car
        779: "Bus",                # school bus
        817: "Coupe",              # sports car
        829: "Bus",                # streetcar / tram
        864: "Truck",              # tow truck
        867: "Truck",              # trailer truck / semi
        874: "Bus",                # trolleybus
    }

    def __init__(self) -> None:
        self._cfg = settings.models.classifier
        self._model = None
        self._custom_model = None
        self._device = settings.get_device(self._cfg.device)
        self._class_names = settings.vehicle_classes.custom_classes
        self._loaded = False
        logger.info("VehicleTypeClassifier initialized")

    def load(self) -> bool:
        """Load deep learning classifier model (MobileNetV3 or custom weights)."""
        import torch
        from pathlib import Path
        
        # 1. Try custom fine-tuned weights first
        try:
            weights = Path(self._cfg.weights_path)
            if weights.exists():
                self._custom_model = torch.load(str(weights), map_location=self._device)
                self._custom_model.eval()
                self._loaded = True
                logger.info(f"✅ Type classifier loaded custom weights: {weights}")
                return True
        except Exception as e:
            logger.debug(f"Custom type classifier weights not loaded: {e}")

        # 2. Load pre-trained MobileNetV3 deep learning model
        try:
            from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights
            self._model = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.DEFAULT)
            self._model.to(self._device)
            self._model.eval()
            self._loaded = True
            logger.info("✅ Type classifier loaded: MobileNetV3 deep learning backbone")
            return True
        except Exception as e:
            logger.warning(f"Deep learning type classifier fallback to YOLO mapping: {e}")
            self._loaded = False
            return False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def classify(
        self,
        vehicle_crop: np.ndarray,
        yolo_class: str = "car",
        bbox: Optional[list] = None,
    ) -> Tuple[str, float]:
        """Classify vehicle type. Returns (vehicle_type, confidence)."""
        # Primary: Custom fine-tuned model if present
        if self._custom_model is not None and vehicle_crop is not None and vehicle_crop.size > 0:
            res = self._classify_with_custom_model(vehicle_crop)
            if res:
                return res

        # Secondary: MobileNetV3 Deep Learning Classifier
        if self._model is not None and vehicle_crop is not None and vehicle_crop.size > 0:
            res = self._classify_with_deep_model(vehicle_crop, yolo_class, bbox)
            if res:
                return res

        # Tertiary: YOLO class map
        vehicle_type = _YOLO_TYPE_MAP.get(yolo_class.lower())
        if vehicle_type:
            return vehicle_type, 0.80

        # Quaternary: aspect ratio heuristic
        if bbox and len(bbox) == 4:
            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]
            aspect = w / max(h, 0.001)
            return _aspect_to_type(aspect, yolo_class), 0.60

        return "Car", 0.50

    def _classify_with_deep_model(
        self,
        image: np.ndarray,
        yolo_class: str,
        bbox: Optional[list],
    ) -> Optional[Tuple[str, float]]:
        """Run MobileNetV3 deep feature classifier with ImageNet vehicle mappings."""
        try:
            import torch
            import torchvision.transforms as T
            from PIL import Image as PILImage

            transform = T.Compose([
                T.Resize((224, 224)),
                T.ToTensor(),
                T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
            ])

            pil_img = PILImage.fromarray(image[:, :, ::-1])  # BGR -> RGB
            tensor = transform(pil_img).unsqueeze(0).to(self._device)

            with torch.no_grad():
                outputs = self._model(tensor)
                probs = torch.softmax(outputs, dim=1)[0]
                top5_probs, top5_indices = torch.topk(probs, 5)

            # Check if any top prediction maps to a vehicle category
            for p, idx in zip(top5_probs.tolist(), top5_indices.tolist()):
                if idx in self.IMAGENET_VEHICLE_MAP:
                    vtype = self.IMAGENET_VEHICLE_MAP[idx]
                    # Calibrate confidence
                    conf = min(0.96, max(0.75, float(p) * 1.5))
                    return vtype, round(conf, 4)

            # If top5 doesn't contain specific vehicle subtype, use aspect ratio refinement on YOLO class
            if bbox and len(bbox) == 4:
                w = bbox[2] - bbox[0]
                h = bbox[3] - bbox[1]
                aspect = w / max(h, 0.001)
                refined = _aspect_to_type(aspect, yolo_class)
                return refined, 0.82

            base_yolo = _YOLO_TYPE_MAP.get(yolo_class.lower(), "Sedan")
            return base_yolo, 0.80

        except Exception as e:
            logger.debug(f"Deep type classifier error: {e}")
            return None

    def _classify_with_custom_model(self, image: np.ndarray) -> Optional[Tuple[str, float]]:
        """Run fine-grained custom ResNet classifier."""
        try:
            import torch
            import torchvision.transforms as T
            from PIL import Image as PILImage

            transform = T.Compose([
                T.Resize((224, 224)),
                T.ToTensor(),
                T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ])

            pil_img = PILImage.fromarray(image[:, :, ::-1])  # BGR→RGB
            tensor = transform(pil_img).unsqueeze(0).to(self._device)

            with torch.no_grad():
                outputs = self._custom_model(tensor)
                probs = torch.softmax(outputs, dim=1)
                conf, idx = probs.max(1)

            class_idx = idx.item()
            confidence = conf.item()

            if class_idx < len(self._class_names) and confidence >= self._cfg.confidence_threshold:
                return self._class_names[class_idx], confidence

        except Exception as e:
            logger.debug(f"Custom classifier error: {e}")
        return None
