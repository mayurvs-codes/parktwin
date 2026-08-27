"""
ParkTwin AI — Indian Number Plate Formatter (v2 — Enhanced)
=============================================================
Normalizes raw OCR output into strict Indian plate formats.

Indian Plate Structures Supported:
  1. Standard   : KA01AB1234  (State[2] + District[2] + Series[1-3] + Number[1-4])
  2. BH Series  : 22BH7777AB  (Year[2] + BH + Number[4] + Series[1-2])
  3. Diplomatic : CD123456
  4. Temporary  : TR1234 / TEMP1234

Key Features:
  - Segment-aware OCR error correction (applies digit↔letter maps only to the
    correct segment: state/series are letter-positions; district/number are digit-positions)
  - Tries all realistic Indian plate length combinations
  - Strict state-code validation against all 37 RTO codes
  - Noise/garbage rejection before any processing
  - Fuzzy scan for embedded plates when OCR adds surrounding chars
  - Partial match & slot repair with confidence penalty (Iteration 2A)
  - Format-validity confidence multiplier (Iteration 2B)
  - Extended character confusion matrix for Indian plate font IS 14164 (Iteration 4A)
  - Beam-search over ambiguous character substitutions (Iteration 4B)
"""

from __future__ import annotations

import re
from itertools import product
from typing import List, Optional, Tuple

# ─── Indian State Codes (all 37 RTOs) ────────────────────────────────────────
_STATE_CODES = frozenset({
    "AN", "AP", "AR", "AS", "BR", "CG", "CH", "DD", "DL", "DN",
    "GA", "GJ", "HP", "HR", "JH", "JK", "KA", "KL", "LA", "LD",
    "MH", "ML", "MN", "MP", "MZ", "NL", "OD", "PB", "PY", "RJ",
    "SK", "TN", "TR", "TS", "UK", "UP", "WB",
})

# In DIGIT positions — convert common letter-lookalikes → their digit equivalents
# Iteration 4A: Extended confusion map for Indian plate font (IS 14164)
_TO_DIGIT = str.maketrans({
    ord("O"): "0",
    ord("I"): "1",
    ord("l"): "1",
    ord("Z"): "2",
    ord("S"): "5",
    ord("B"): "8",
    ord("G"): "6",
    ord("D"): "0",
    ord("U"): "0",
    ord("Q"): "0",
    ord("T"): "7",
})

# In LETTER positions — convert common digit-lookalikes → their letter equivalents
# Iteration 4A: Extended: 4→A, 3→E, 6→G added
_TO_LETTER = str.maketrans({
    ord("0"): "O",
    ord("1"): "I",
    ord("5"): "S",
    ord("2"): "Z",
    ord("8"): "B",
    ord("6"): "G",
    ord("4"): "A",
    ord("3"): "E",
})

# Strip all non-alphanumeric
_STRIP_RE = re.compile(r"[^A-Z0-9]")

# ─── Plate Patterns (strict) ──────────────────────────────────────────────────
_STANDARD_RE = re.compile(r"^([A-Z]{2})(\d{2})([A-Z]{1,3})(\d{1,4})$")
_BH_RE       = re.compile(r"^(\d{2})BH(\d{4})([A-Z]{1,2})$")
_DIPLOMATIC_RE = re.compile(r"^CD\d{3,6}$")
_TEMP_RE     = re.compile(r"^(TEMP|TR)\d{2,6}$")

# All valid Indian plate segment-length combinations [state, district, series, serial]
_PLATE_STRUCTURES = [
    (2, 2, 2, 4),   # KA01AB1234  — most common (10 chars)
    (2, 2, 1, 4),   # KA01A1234   — two-wheeler (9 chars)
    (2, 2, 3, 4),   # KA01ABC1234 — (11 chars)
    (2, 2, 2, 3),   # KA01AB123   — (9 chars)
    (2, 2, 3, 3),   # KA01ABC123  — (10 chars)
    (2, 2, 1, 3),   # KA01A123    — (8 chars)
    (2, 1, 2, 4),   # KA1AB1234   — (9 chars, rare)
    (2, 2, 3, 2),   # KA01ABC12   — (9 chars, old)
]

_MIN_PLATE_LEN = 6
_MAX_PLATE_LEN = 12

# ─── Iteration 2B: Format-Validity Confidence Multipliers ────────────────────
_CONF_MULTIPLIERS = {
    "indian_standard":            1.10,
    "indian_standard_unverified": 0.95,
    "bh_series":                  1.10,
    "diplomatic":                 0.90,
    "temp":                       0.85,
    "partial_recovery":           0.85,
    "international":              0.60,
    "noise":                      0.00,
}

# ─── Iteration 4A & Phase 3: Extended character confusion maps for Indian font IS 14164 ───
_VISUAL_MAP = {
    "4": ["A", "K", "H"],
    "0": ["O", "D", "A", "U", "Q"],
    "1": ["I", "L", "T", "J"],
    "6": ["G", "K", "C", "B"],
    "8": ["B", "R", "S"],
    "5": ["S"],
    "9": ["P", "R"],
    "3": ["E", "B"],
    "2": ["Z"],
    "7": ["T", "Z", "Y"],
    "O": ["0", "D", "Q", "A"],
    "K": ["4", "6", "R", "H"],
    "A": ["4", "0", "H"],
    "D": ["0", "O", "B"],
    "B": ["8", "6", "3", "D"],
    "S": ["5", "8"],
    "G": ["6", "0", "C"],
    "Z": ["2", "7"],
    "T": ["7", "1", "I"],
    "I": ["1", "L", "T"],
    "L": ["1", "I"],
    "P": ["9", "R", "F"],
}

_DIGIT_AMBIGUITIES = {
    "O": "0", "0": "O",
    "I": "1", "1": "I",
    "l": "1",
    "G": "6", "6": "G",
    "B": "8", "8": "B",
    "S": "5", "5": "S",
    "Z": "2", "2": "Z",
    "D": "0",
    "U": "0",
    "Q": "0",
    "T": "7",
    "A": "4",
}
_LETTER_AMBIGUITIES = {
    "0": "O",
    "1": "I",
    "5": "S",
    "8": "B",
    "6": "G",
    "4": "A",
    "3": "E",
    "9": "P",
    "7": "T",
    "2": "Z",
}



class PlateFormatter:
    """
    Normalizes and validates license plate text from OCR output.

    Applies position-aware OCR corrections:
    - State code / series (letter segments): digit lookalikes → letters
    - District / serial number (digit segments): letter lookalikes → digits

    v2 additions:
    - Partial match & slot repair (format_with_partial_fallback)
    - Format-validity confidence multiplier (_CONF_MULTIPLIERS)
    - Extended character confusion matrix for Indian plate font IS 14164
    - Beam-search over top character ambiguities
    """

    def format(self, raw_text: str) -> Tuple[str, str, float]:
        """
        Normalize raw OCR plate text to Indian format.

        Returns:
            (formatted_plate, plate_format, confidence_adjustment)
            Returns ("", "noise", 0.0) for garbage / rejected input.
        """
        if not raw_text:
            return "", "unknown", 0.0

        cleaned = self._strip(raw_text)

        # Reject obvious garbage early
        if not self._is_plausible(cleaned):
            return "", "noise", 0.0

        # ── 1. Try standard format as-is ─────────────────────────────────────
        result = self._try_standard(cleaned)
        if result:
            return result

        # ── 2. Apply segment-aware correction and retry ───────────────────────
        corrected = self._segment_correct(cleaned)
        if corrected and corrected != cleaned:
            result = self._try_standard(corrected)
            if result:
                return result

        # ── 3. BH series ─────────────────────────────────────────────────────
        result = self._try_bh(cleaned)
        if result:
            return result

        # ── 4. Diplomatic / Temporary ─────────────────────────────────────────
        if _DIPLOMATIC_RE.match(cleaned):
            return cleaned, "diplomatic", 0.85
        if _TEMP_RE.match(cleaned):
            return cleaned, "temp", 0.80

        # ── 5. Beam search over character ambiguities (Iteration 4B) ─────────
        result = self._beam_search(cleaned)
        if result:
            return result

        # ── 6. Bayesian RTO Levenshtein State-Code Repair ────────────────────
        result = self._levenshtein_rto_repair(cleaned)
        if result:
            return result

        # ── 7. Fuzzy scan: look for embedded Indian plate in longer string ─────
        result = self._fuzzy_scan(cleaned)
        if result:
            return result

        # ── 8. Partial recovery — accept ≥6 char partial match (Iteration 2A) ─
        result = self._partial_recovery(cleaned)
        if result:
            return result

        # ── 9. Return cleaned text as best-effort unknown ─────────────────────
        if _MIN_PLATE_LEN <= len(cleaned) <= _MAX_PLATE_LEN:
            return cleaned, "international", 0.55

        return "", "noise", 0.0

    def format_with_partial_fallback(
        self, raw_text: str, raw_crop: Optional[object] = None
    ) -> Tuple[str, str, float]:
        """
        Full format attempt with partial fallback.

        Iteration 2A: When standard format fails but ≥6 chars are plausible,
        accepts the partial match at confidence 0.75 instead of fully rejecting.

        Args:
            raw_text: Raw OCR text.
            raw_crop: Original plate crop (optional, reserved for future re-OCR).

        Returns:
            (formatted_plate, plate_format, confidence_adjustment)
        """
        result = self.format(raw_text)
        if result[2] > 0.0:
            return result

        # Try partial recovery
        partial = self._partial_recovery(self._strip(raw_text))
        if partial:
            return partial

        return result

    def get_confidence_multiplier(self, plate_format: str) -> float:
        """Return the format-validity confidence multiplier (Iteration 2B)."""
        return _CONF_MULTIPLIERS.get(plate_format, 0.55)

    # ─── Private Helpers ────────────────────────────────────────────────────

    def _strip(self, text: str) -> str:
        """Strip to uppercase alphanumeric only, and strip leading HSRP prefix noise."""
        cleaned = _STRIP_RE.sub("", text.upper().strip())
        # Strip HSRP badge noise if followed by a recognized 2-letter state code
        for pfx in ("IND", "IN", "E", "I"):
            if cleaned.startswith(pfx) and len(cleaned) >= len(pfx) + 6:
                possible_state = cleaned[len(pfx): len(pfx) + 2]
                if possible_state in _STATE_CODES:
                    cleaned = cleaned[len(pfx):]
                    break
        return cleaned

    def _is_plausible(self, text: str) -> bool:
        """
        Reject obvious garbage:
          - Too short or too long
          - Fewer than 2 letters or fewer than 1 digit
          - All same character
        """
        if len(text) < _MIN_PLATE_LEN or len(text) > _MAX_PLATE_LEN:
            return False
        letters = sum(c.isalpha() for c in text)
        digits  = sum(c.isdigit() for c in text)
        if letters < 2 or digits < 1:
            return False
        if len(set(text)) <= 1:
            return False
        return True

    def _segment_correct(self, text: str) -> str:
        """
        Apply position-aware OCR correction by trying each known plate structure.

        For each structure (state_len, dist_len, series_len, num_len):
          - State & series segments: convert digit lookalikes → letters
          - District & serial segments: convert letter lookalikes → digits
        Returns the first corrected string that yields a clean result.
        """
        for s_len, d_len, sr_len, n_len in _PLATE_STRUCTURES:
            total = s_len + d_len + sr_len + n_len
            if len(text) != total:
                continue

            state_raw  = text[0                    : s_len]
            dist_raw   = text[s_len                : s_len + d_len]
            series_raw = text[s_len + d_len        : s_len + d_len + sr_len]
            num_raw    = text[s_len + d_len + sr_len:]

            # Correct each segment to its expected character type
            state  = self._force_letters(state_raw)
            dist   = self._force_digits(dist_raw)
            series = self._force_letters(series_raw)
            num    = self._force_digits(num_raw)

            # Only accept if ALL segments now contain the right char type
            if (all(c.isalpha() for c in state)  and len(state)  == s_len  and
                all(c.isdigit() for c in dist)    and len(dist)   == d_len  and
                all(c.isalpha() for c in series)  and len(series) == sr_len and
                all(c.isdigit() for c in num)     and len(num)    == n_len):
                return f"{state}{dist}{series}{num}"

        return text

    def _force_letters(self, segment: str) -> str:
        """Convert digit-lookalikes in a letter segment."""
        result = []
        for ch in segment:
            if ch.isalpha():
                result.append(ch)
            elif ch.isdigit():
                converted = ch.translate(_TO_LETTER)
                result.append(converted)
            # else: non-alnum already stripped
        return "".join(result)

    def _force_digits(self, segment: str) -> str:
        """Convert letter-lookalikes in a digit segment."""
        result = []
        for ch in segment:
            if ch.isdigit():
                result.append(ch)
            elif ch.isalpha():
                converted = ch.translate(_TO_DIGIT)
                result.append(converted)
        return "".join(result)

    def _try_standard(self, text: str) -> Optional[Tuple[str, str, float]]:
        """Match strict Indian standard format and validate state and district code."""
        m = _STANDARD_RE.match(text)
        if not m:
            return None
        state, district, series, number = m.groups()
        dist_num = int(district)
        # Indian district code is 01..99
        if dist_num == 0 or dist_num > 99:
            return None
        formatted = f"{state}{district.zfill(2)}{series}{number.zfill(4)}"
        if state in _STATE_CODES:
            return formatted, "indian_standard", 1.0
        return formatted, "indian_standard_unverified", 0.85

    def _try_bh(self, text: str) -> Optional[Tuple[str, str, float]]:
        """Match BH Bharat Series format."""
        m = _BH_RE.match(text)
        if not m:
            return None
        year, number, series = m.groups()
        return f"{year}BH{number}{series}", "bh_series", 1.0

    def _repair_state_prefix(self, prefix: str) -> Optional[str]:
        """
        Repair a garbled 2-character state prefix by checking visual ambiguities
        against all 37 Indian RTO state codes.
        """
        if len(prefix) < 2:
            return None
        p = prefix.upper()
        if p in _STATE_CODES:
            return p
        c1_opts = [p[0]] + _VISUAL_MAP.get(p[0], [])
        c2_opts = [p[1]] + _VISUAL_MAP.get(p[1], [])
        for a in c1_opts:
            for b in c2_opts:
                cand = a + b
                if cand in _STATE_CODES:
                    return cand
        return None

    def _beam_search(self, text: str, max_candidates: int = 36) -> Optional[Tuple[str, str, float]]:
        """
        Iteration 4B & Phase 3: Beam search over ambiguous character substitutions
        and state-code prefix guidance.
        """
        if not (6 <= len(text) <= 12):
            return None

        # Check if state prefix repair immediately resolves the plate
        if len(text) >= 8:
            repaired_state = self._repair_state_prefix(text[:2])
            if repaired_state and repaired_state != text[:2]:
                repaired_text = repaired_state + text[2:]
                corrected = self._segment_correct(repaired_text)
                res = self._try_standard(corrected)
                if res and res[0][:2] in _STATE_CODES:
                    plate, fmt, adj = res
                    return plate, fmt, max(0.80, adj - 0.05)

        # Build list of (position, original_char, alternative_char) for ambiguous positions
        ambiguous_positions: List[Tuple[int, str, str]] = []
        for i, ch in enumerate(text):
            alt = _DIGIT_AMBIGUITIES.get(ch) or _LETTER_AMBIGUITIES.get(ch)
            if alt and alt != ch:
                ambiguous_positions.append((i, ch, alt))

        if not ambiguous_positions:
            return None

        # Limit to at most 5 ambiguous positions
        ambiguous_positions = ambiguous_positions[:5]

        best: Optional[Tuple[str, str, float]] = None
        explored = 0

        choices = [(pos, orig, alt) for pos, orig, alt in ambiguous_positions]
        for combo in product(*[[orig, alt] for _, orig, alt in choices]):
            if explored >= max_candidates:
                break
            explored += 1

            candidate = list(text)
            for i, (pos, orig, alt) in enumerate(choices):
                candidate[pos] = combo[i]
            candidate_str = "".join(candidate)

            corrected = self._segment_correct(candidate_str)
            result = self._try_standard(corrected)
            if result and result[0][:2] in _STATE_CODES:
                n_subs = sum(1 for i, (pos, orig, alt) in enumerate(choices) if combo[i] == alt)
                penalty = 0.02 * n_subs
                plate, fmt, adj = result
                adj = max(0.0, adj - penalty)
                if not best or adj > best[2]:
                    best = (plate, fmt, adj)

        return best


    def _fuzzy_scan(self, text: str) -> Optional[Tuple[str, str, float]]:
        """
        Scan text for an embedded Indian plate pattern.
        Useful when OCR adds extra characters around the plate.
        """
        for length in range(min(len(text), 11), 7, -1):
            for start in range(len(text) - length + 1):
                sub = text[start:start + length]
                corrected = self._segment_correct(sub)
                result = self._try_standard(corrected)
                if result and result[0][:2] in _STATE_CODES:
                    plate, fmt, adj = result
                    return plate, fmt, adj * 0.90  # slight penalty for fuzzy match
        return None

    def _partial_recovery(self, text: str) -> Optional[Tuple[str, str, float]]:
        """
        Iteration 2A: Partial match & slot repair.

        When OCR returns a partially correct plate (≥6 plausible chars)
        that doesn't fully match any format, try to recover by:
        1. Extracting the best continuous sub-string that looks like a plate
        2. Accepting it with confidence_adjustment = 0.75

        Returns (plate, 'partial_recovery', 0.75) or None.
        """
        if not self._is_plausible(text):
            return None

        # Already tried full format — this is the fallback for near-misses
        # Try smaller windows that might be valid
        for length in range(min(len(text), 10), 5, -1):
            for start in range(len(text) - length + 1):
                sub = text[start:start + length]
                if not self._is_plausible(sub):
                    continue
                corrected = self._segment_correct(sub)
                if corrected and len(corrected) >= 6:
                    # Check if it looks like an Indian plate (starts with 2 letters that are a state code)
                    if corrected[:2] in _STATE_CODES:
                        return corrected, "partial_recovery", 0.75
        return None

    def _levenshtein_rto_repair(self, text: str) -> Optional[Tuple[str, str, float]]:
        """
        Bayesian RTO State-Code repair using Levenshtein edit-distance and visual font confusion.
        Repairs common 1-character OCR corruptions in state prefix (e.g. 'K4' -> 'KA', '0D' -> 'OD', 'TNI' -> 'TN').
        """
        if len(text) < 8:
            return None

        # Common 1-char visual substitutions in first 2 letters
        prefix = text[:2].upper()
        if prefix in _STATE_CODES:
            return None

        best_match = None
        for state in _STATE_CODES:
            # 1-char edit distance or visual substitution match
            diff = sum(1 for a, b in zip(prefix, state) if a != b)
            is_visual_sub = (
                prefix[0] in _VISUAL_MAP.get(state[0], []) or
                prefix[1] in _VISUAL_MAP.get(state[1], []) or
                state[0] in _VISUAL_MAP.get(prefix[0], []) or
                state[1] in _VISUAL_MAP.get(prefix[1], [])
            )
            if diff == 1 or is_visual_sub:
                # Try replacing prefix
                candidate = state + text[2:]
                corrected = self._segment_correct(candidate)
                result = self._try_standard(corrected)
                if result:
                    plate, fmt, adj = result
                    return plate, fmt, adj * 0.88

                # Try handling if OCR added an extra char between state and district (e.g. 'KA_01...')
                if len(text) >= 9:
                    candidate_skip = state + text[3:]
                    corrected_skip = self._segment_correct(candidate_skip)
                    result_skip = self._try_standard(corrected_skip)
                    if result_skip:
                        plate, fmt, adj = result_skip
                        return plate, fmt, adj * 0.82

        return None

    def format_stacked_lines(self, lines: List[str]) -> Tuple[str, str, float]:
        """
        Parse and fuse two-row / stacked plates (common on two-wheelers and commercial vehicles).
        E.g. line 1: 'KA 01', line 2: 'EA 1234' -> 'KA01EA1234'.
        """
        if not lines:
            return "", "noise", 0.0
        if len(lines) == 1:
            return self.format(lines[0])

        # Filter out very short noise lines
        clean_lines = [self._strip(l) for l in lines if len(self._strip(l)) >= 2]
        if not clean_lines:
            return "", "noise", 0.0

        # Try top-to-bottom concatenation
        joined = "".join(clean_lines)
        res = self.format(joined)
        if res[1] != "noise":
            return res

        # Try bottom-to-top (in case OCR returned inverted line order)
        joined_rev = "".join(reversed(clean_lines))
        res_rev = self.format(joined_rev)
        if res_rev[1] != "noise":
            return res_rev

        return res

    def is_valid_indian(self, plate: str) -> bool:
        """Check if a plate string matches any valid Indian format."""
        cleaned = self._strip(plate)
        return bool(
            _STANDARD_RE.match(cleaned) or
            _BH_RE.match(cleaned) or
            _DIPLOMATIC_RE.match(cleaned) or
            _TEMP_RE.match(cleaned)
        )

    def extract_state(self, plate: str) -> Optional[str]:
        """Extract and validate state code from an Indian plate."""
        cleaned = self._strip(plate)
        m = _STANDARD_RE.match(cleaned)
        if m:
            state = m.group(1)
            return state if state in _STATE_CODES else None
        return None

    def fix_ocr_errors(self, plate: str, position: str = "number") -> str:
        """Fix common OCR character confusions in a specific position type."""
        if position == "number":
            return plate.translate(_TO_DIGIT)
        if position == "letter":
            return plate.translate(_TO_LETTER)
        return plate
