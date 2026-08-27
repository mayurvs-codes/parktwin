"""Unit tests for the license plate validators (pure Python, no GPU)."""

from shared.helpers.validators import validate_license_plate


def test_indian_standard_valid():
    res = validate_license_plate("KA01AB1234")
    assert res["valid"] is True
    assert res["format"] == "indian_standard"
    assert res["cleaned"] == "KA01AB1234"


def test_indian_standard_with_spaces_and_lowercase():
    res = validate_license_plate("ka 01 ab 1234")
    assert res["valid"] is True
    assert res["cleaned"] == "KA01AB1234"


def test_indian_bh_series():
    res = validate_license_plate("21BH5678AA")
    assert res["valid"] is True
    assert res["format"] == "indian_bh"


def test_non_plate_text_invalid():
    res = validate_license_plate("HELLO")
    assert res["valid"] is False
    assert res["format"] == "invalid"


def test_empty_plate():
    res = validate_license_plate("")
    assert res["valid"] is False
    assert res["cleaned"] == ""


def test_plausible_other_format():
    # At least 4 chars with letters + digits -> plausible (not strictly Indian).
    res = validate_license_plate("ABC123")
    assert res["valid"] is True
    assert res["format"] == "other_plausible"
