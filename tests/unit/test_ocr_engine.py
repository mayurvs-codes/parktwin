"""
Unit tests for the OCR engine (Module 1 — Task 4).

These tests exercise the engine's confidence filtering, empty-image handling,
and version detection WITHOUT downloading/loading PaddleOCR or EasyOCR weights.
The heavy ``_paddle`` / ``_easyocr`` backends are monkeypatched so the test is
fast and offline.
"""

from types import SimpleNamespace

import numpy as np
import pytest

from modules.vehicle_recognition.ocr.ocr_engine import OCREngine, OCRResult


def _img():
    return np.full((60, 200, 3), 255, np.uint8)


def _paddle_raw(text, conf):
    """Mimic paddleocr's ocr() output structure: [[ [poly, (text, conf)] ]]."""
    return [[[ [[0, 0], [1, 0], [1, 1], [0, 1]], (text, conf) ]]]


def test_paddle_major_version_detected():
    eng = OCREngine()
    assert eng._paddle_major_version() in (2, 3)


def test_read_returns_none_when_no_engine_loaded():
    eng = OCREngine()
    eng._active_engine = "none"
    assert eng.read(_img()) is None


def test_read_returns_none_on_empty_image():
    eng = OCREngine()
    eng._active_engine = "paddleocr"
    assert eng.read(np.zeros((0, 0, 3), np.uint8)) is None
    assert eng.read(None) is None


def test_read_paddle_passes_above_threshold():
    eng = OCREngine()
    eng._active_engine = "paddleocr"
    # Real paddle v2 ``ocr()`` is called as ``ocr(image, cls=...)`` (see
    # ``OCREngine._read_paddle``); the fake must accept the kwarg.
    eng._paddle = SimpleNamespace(ocr=lambda image, **kwargs: _paddle_raw("KA01AB1234", 0.95))
    res = eng._read_paddle(_img())
    assert res is not None
    assert res.raw_text == "KA01AB1234"
    assert res.confidence == 0.95


def test_read_paddle_filtered_below_threshold():
    eng = OCREngine()
    eng._active_engine = "paddleocr"
    eng._paddle = SimpleNamespace(ocr=lambda image: _paddle_raw("GARBAGE", 0.30))
    # 0.30 < ocr.confidence_threshold (0.45) -> rejected.
    assert eng._read_paddle(_img()) is None



def test_read_paddle_empty_result():
    eng = OCREngine()
    eng._active_engine = "paddleocr"
    eng._paddle = SimpleNamespace(ocr=lambda image: [[]])
    assert eng._read_paddle(_img()) is None


def test_read_easyocr_backend_threshold():
    eng = OCREngine()
    eng._active_engine = "easyocr"
    eng._easyocr = SimpleNamespace(
        readtext=lambda image: [([[0, 0], [1, 0], [1, 1], [0, 1]], "DL03EF9012", 0.99)]
    )
    res = eng._read_easyocr(_img())
    assert res is not None
    assert res.engine == "easyocr"
    assert res.confidence == 0.99


def test_read_easyocr_below_threshold():
    eng = OCREngine()
    eng._active_engine = "easyocr"
    eng._easyocr = SimpleNamespace(
        readtext=lambda image: [([[0, 0], [1, 0], [1, 1], [0, 1]], "XX", 0.40)]
    )
    assert eng._read_easyocr(_img()) is None


def test_ocr_result_serializes():
    r = OCRResult("KA01AB1234", 0.9, "paddleocr", ["KA01AB1234"])
    d = r.to_dict()
    assert d["raw_text"] == "KA01AB1234"
    assert d["engine"] == "paddleocr"
    assert d["confidence"] == 0.9
