"""Unit tests for the OCR plate formatter / fusion logic (pure Python)."""

from modules.vehicle_recognition.fusion.plate_formatter import PlateFormatter


def test_format_indian_standard():
    f = PlateFormatter()
    formatted, fmt, conf = f.format("KA01AB1234")
    assert formatted == "KA01AB1234"
    assert fmt == "indian_standard"
    assert conf == 1.0


def test_format_strips_spaces_and_lowercase():
    f = PlateFormatter()
    formatted, fmt, _ = f.format("mh 12 cd 5678")
    assert formatted == "MH12CD5678"
    assert fmt == "indian_standard"


def test_format_bh_series():
    f = PlateFormatter()
    formatted, fmt, _ = f.format("21BH0001AA")
    assert formatted == "21BH0001AA"
    assert fmt == "bh_series"


def test_format_unverified_state_code():
    # "ZZ" is not a valid Indian state code -> unverified, lower confidence.
    f = PlateFormatter()
    formatted, fmt, conf = f.format("ZZ99XY0001")
    assert formatted == "ZZ99XY0001"
    assert fmt == "indian_standard_unverified"
    assert conf < 1.0


def test_ocr_fix_zero_for_letter_o_in_number():
    f = PlateFormatter()
    # OCR often reads 'O' in the numeric portion; relaxed match fixes it.
    formatted, fmt, _ = f.format("KA01AB123O")
    assert formatted == "KA01AB1230"
    assert fmt == "indian_standard"


def test_extract_state():
    f = PlateFormatter()
    assert f.extract_state("DL03EF9012") == "DL"
    assert f.extract_state("ZZ99XY0001") is None


def test_is_valid_indian():
    f = PlateFormatter()
    assert f.is_valid_indian("KA01AB1234") is True
    assert f.is_valid_indian("HELLO") is False
