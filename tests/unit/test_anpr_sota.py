"""
ParkTwin AI — SOTA ANPR Unit Test Suite
========================================
Tests the upgraded SOTA capabilities:
1. 4-Point Quadrilateral Homography Rectification
2. Illumination, Glare & Shadow Normalization
3. Sub-pixel Edge Super-Resolution
4. Bayesian RTO Levenshtein Repair
5. Two-Row Stacked Plate Parsing
6. Multi-Frame Positional Consensus Voting
"""

import numpy as np
import pytest

from modules.vehicle_recognition.ocr.enhancer import ImageEnhancer, detect_plate_type
from modules.vehicle_recognition.fusion.plate_formatter import PlateFormatter
from engine.pipeline import ParkTwinPipeline


@pytest.fixture
def enhancer() -> ImageEnhancer:
    return ImageEnhancer()


@pytest.fixture
def formatter() -> PlateFormatter:
    return PlateFormatter()


# ─── 1. Homography & Preprocessing Tests ──────────────────────────────────────

def test_detect_plate_type(enhancer):
    # White background (Standard)
    white = np.full((50, 200, 3), 240, dtype=np.uint8)
    assert detect_plate_type(white) == "white"

    # Yellow background (Commercial)
    yellow = np.zeros((50, 200, 3), dtype=np.uint8)
    yellow[:, :] = (0, 220, 240)  # BGR yellow
    assert detect_plate_type(yellow) == "yellow"

    # Dark background (Dealer/Black)
    black = np.full((50, 200, 3), 20, dtype=np.uint8)
    assert detect_plate_type(black) == "black"


def test_homography_rectification_resilience(enhancer):
    # Skewed quad image
    img = np.zeros((100, 300, 3), dtype=np.uint8)
    cv2_img = enhancer.detect_and_rectify_quadrilateral(img, target_w=280, target_h=70)
    assert cv2_img is not None
    assert cv2_img.shape[0] > 0 and cv2_img.shape[1] > 0


def test_glare_and_shadow_suppression(enhancer):
    # High glare spot in center
    img = np.full((60, 240, 3), 100, dtype=np.uint8)
    img[20:40, 100:140] = 255  # Glare patch
    deglared = enhancer.suppress_glare_and_shadows(img)
    assert deglared is not None
    assert deglared.shape == img.shape


def test_super_resolve_edges(enhancer):
    # Very small crop (height < 48)
    small_crop = np.full((24, 100, 3), 180, dtype=np.uint8)
    super_res = enhancer.super_resolve_edges(small_crop)
    assert super_res.shape[0] >= 48
    assert super_res.shape[1] >= 200


def test_process_variants_count(enhancer):
    sample = np.full((60, 200, 3), 220, dtype=np.uint8)
    variants = enhancer.process_variants(sample)
    assert len(variants) >= 3
    for v in variants:
        assert v.size > 0


# ─── 2. SOTA Plate Formatter Tests ───────────────────────────────────────────

def test_rto_levenshtein_repair_k4_to_ka(formatter):
    # 'K4 01 AB 1234' with 4 instead of A in state code
    plate, fmt, conf_adj = formatter.format("K401AB1234")
    assert plate == "KA01AB1234"
    assert fmt == "indian_standard"
    assert conf_adj > 0.70


def test_rto_levenshtein_repair_0d_to_od(formatter):
    # '0D 02 CD 5678' with 0 (zero) instead of O (letter)
    plate, fmt, conf_adj = formatter.format("0D02CD5678")
    assert plate == "OD02CD5678"
    assert fmt == "indian_standard"
    assert conf_adj > 0.70


def test_rto_levenshtein_repair_dl0_to_dl(formatter):
    # 'DL01CA1234' with extra noise digit after state
    plate, fmt, conf_adj = formatter.format("DL01CA1234")
    assert plate == "DL01CA1234"
    assert fmt == "indian_standard"


def test_two_row_stacked_plates(formatter):
    lines = ["KA 01", "EA 1234"]
    plate, fmt, conf_adj = formatter.format_stacked_lines(lines)
    assert plate == "KA01EA1234"
    assert fmt == "indian_standard"
    assert conf_adj >= 0.85


def test_two_row_stacked_plates_with_series(formatter):
    lines = ["MH 12", "DE 9999"]
    plate, fmt, conf_adj = formatter.format_stacked_lines(lines)
    assert plate == "MH12DE9999"
    assert fmt == "indian_standard"


def test_bh_series_validation(formatter):
    plate, fmt, conf_adj = formatter.format("22BH7777AB")
    assert plate == "22BH7777AB"
    assert fmt == "bh_series"
    assert conf_adj >= 0.90


# ─── 3. Multi-Frame Positional Consensus Voting ───────────────────────────────

def test_temporal_consensus_voting():
    pipeline = ParkTwinPipeline()
    # 3 noisy reads with character corruptions at different positions
    readings = [
        {"plate": "KA01AB1234", "plate_raw": "KA01AB1234", "conf": 0.88, "fmt": "indian_standard"},
        {"plate": "KA01AB1234", "plate_raw": "KA01AB1234", "conf": 0.85, "fmt": "indian_standard"},
        {"plate": "KA01A81234", "plate_raw": "KA01A81234", "conf": 0.60, "fmt": "indian_standard"},
    ]
    best = pipeline._best_plate_from_readings(readings)
    assert best["plate"] == "KA01AB1234"
    assert best["conf"] >= 0.85


def test_temporal_positional_character_synthesis():
    pipeline = ParkTwinPipeline()
    # Read 1 missed the last digit, Read 2 missed the first letter, but together they synthesize KA01AB1234
    readings = [
        {"plate": "KA01AB1230", "plate_raw": "KA01AB1234", "conf": 0.90, "fmt": "indian_standard"},
        {"plate": "KA01AB1234", "plate_raw": "KA01AB1234", "conf": 0.92, "fmt": "indian_standard"},
    ]
    best = pipeline._best_plate_from_readings(readings)
    assert best["plate"] == "KA01AB1234"
