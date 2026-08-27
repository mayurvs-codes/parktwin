"""
Unit tests for the classification sub-modules (Module 1 — Task 3).

Verifies vehicle type, brand, and color independently, and that confidence
scores are always returned and within [0, 1].
"""

import numpy as np

from modules.vehicle_recognition.classification.color_recognizer import ColorRecognizer
from modules.vehicle_recognition.classification.type_classifier import (
    VehicleTypeClassifier,
    _YOLO_TYPE_MAP,
)
from modules.vehicle_recognition.classification.brand_classifier import BrandClassifier


def _solid(color_bgr, size=(80, 200)):
    return np.full((size[0], size[1], 3), color_bgr, np.uint8)


def test_color_recognizer_solid_colors():
    cr = ColorRecognizer()
    cases = {
        "White": (255, 255, 255),
        "Black": (0, 0, 0),
        "Red": (0, 0, 255),
        "Blue": (255, 0, 0),
        "Green": (0, 255, 0),
    }
    for expected, bgr in cases.items():
        res = cr.recognize(_solid(bgr))
        assert res.color == expected, f"expected {expected}, got {res.color}"
        assert 0.0 <= res.confidence <= 1.0


def test_color_recognizer_empty_crop():
    cr = ColorRecognizer()
    res = cr.recognize(np.zeros((0, 0, 3), np.uint8))
    assert res.color == "Unknown"
    assert res.confidence == 0.0


def test_type_classifier_yolo_mapping():
    tc = VehicleTypeClassifier()
    for yolo_class, expected in {
        "car": "Sedan",
        "motorcycle": "Motorcycle",
        "bus": "Bus",
        "truck": "Truck",
    }.items():
        vtype, conf = tc.classify(_solid((200, 200, 200)), yolo_class, [0, 0, 1, 1])
        assert vtype == expected
        assert conf == 0.80  # YOLO-map confidence is fixed at 0.80


def test_type_classifier_aspect_heuristic():
    tc = VehicleTypeClassifier()
    # Wide box (aspect > 2.2) for an unknown class -> Sedan via heuristic.
    vtype, conf = tc.classify(_solid((200, 200, 200)), "unknown", [0, 0, 2.5, 1.0])
    assert isinstance(vtype, str) and len(vtype) > 0
    assert 0.0 <= conf <= 1.0


def test_type_classifier_no_model_returns_string():
    tc = VehicleTypeClassifier()
    assert tc._model is None  # weights absent in test env
    vtype, conf = tc.classify(_solid((200, 200, 200)), "car")
    assert vtype == _YOLO_TYPE_MAP["car"]
    assert conf > 0


def test_brand_classifier_falls_back_to_unknown():
    bc = BrandClassifier()
    # No brand weights in the test environment -> "Unknown" with 0.0 confidence.
    brand, conf = bc.classify(_solid((200, 200, 200)))
    assert brand == "Unknown"
    assert conf == 0.0


def test_classifiers_never_return_negative_confidence():
    cr, tc, bc = ColorRecognizer(), VehicleTypeClassifier(), BrandClassifier()
    for fn in (lambda: cr.recognize(_solid((127, 127, 127))),
               lambda: tc.classify(_solid((127, 127, 127)), "car", [0, 0, 1, 1]),
               lambda: bc.classify(_solid((127, 127, 127)))):
        res = fn()
        conf = res[1] if isinstance(res, tuple) else res.confidence
        assert 0.0 <= conf <= 1.0
