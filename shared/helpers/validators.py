"""
ParkTwin AI — License Plate Validators
=======================================
Validates normalized license plate text against standard formats,
primarily focusing on Indian vehicle registration patterns.
"""

import re
from typing import Dict, Any

# Regular Expressions for Indian License Plates
# Standard: State Code (2 letters) + District (2 numbers) + Series (1-2 letters) + Number (4 numbers)
# e.g., KA01AB1234, DL3CBA5678
INDIAN_STANDARD_PATTERN = re.compile(r"^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$")

# BH Series: Year (2 numbers) + BH + Series (2 letters) + Number (4 numbers)
# e.g., 21BH5678AA
INDIAN_BH_PATTERN = re.compile(r"^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$")

# Diplomatic: CC/CD (2 numbers/letters) + Code (2 numbers) + Series + Number
# e.g., 77CD12, 11CC3456
INDIAN_DIPLOMATIC_PATTERN = re.compile(r"^[0-9]{2,3}(CD|CC)[0-9]{2,4}$")

# Temporary / Military: Typically numbers with arrows or custom prefixes
# e.g., ↑09D123456A or state-specific temp codes
INDIAN_MILITARY_PATTERN = re.compile(r"^[0-9]{2}[A-Z][0-9]{5,6}[A-Z]$")

def validate_license_plate(text: str) -> Dict[str, Any]:
    """
    Validate a plate text and determine its format class.
    Returns:
        Dict detailing the validity, format_type, and cleaned text.
    """
    # Remove all non-alphanumeric characters and force uppercase
    cleaned = re.sub(r"[^A-Z0-9]", "", text.upper())

    if not cleaned:
        return {"valid": False, "format": "unknown", "cleaned": ""}

    if INDIAN_STANDARD_PATTERN.match(cleaned):
        return {"valid": True, "format": "indian_standard", "cleaned": cleaned}

    if INDIAN_BH_PATTERN.match(cleaned):
        return {"valid": True, "format": "indian_bh", "cleaned": cleaned}

    if INDIAN_DIPLOMATIC_PATTERN.match(cleaned):
        return {"valid": True, "format": "indian_diplomatic", "cleaned": cleaned}

    if INDIAN_MILITARY_PATTERN.match(cleaned):
        return {"valid": True, "format": "indian_military", "cleaned": cleaned}

    # Loose fallback validation (e.g. at least 4 chars, contains letters and numbers)
    is_plausible = len(cleaned) >= 4 and any(c.isalpha() for c in cleaned) and any(c.isdigit() for c in cleaned)

    return {
        "valid": is_plausible,
        "format": "other_plausible" if is_plausible else "invalid",
        "cleaned": cleaned
    }
