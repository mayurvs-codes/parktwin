# License Plate Formatting & Indian Standards (`modules/vehicle_recognition/fusion/plate_formatter.py`)

`PlateFormatter` standardizes raw OCR strings into compliant Indian High Security Registration Plate (HSRP) formats.

---

## Indian License Plate Format Specifications

Standard Indian vehicle plates follow the statutory format:
$$\underbrace{\text{KA}}_{\text{State (2 letters)}} \quad \underbrace{\text{05}}_{\text{RTO District (2 digits)}} \quad \underbrace{\text{HM}}_{\text{Series (1-3 letters)}} \quad \underbrace{\text{6963}}_{\text{Registration Number (4 digits)}}$$

**Regex Pattern**:
```regex
^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}$
```

---

## Post-Processing Rules

1. **HSRP Security Strip Removal**: Discards leading `IND` watermark text detected by OCR.
2. **Character Substitution Matrix**:
   - `O` / `D` $\leftrightarrow$ `0` in number segments.
   - `I` / `L` $\leftrightarrow$ `1` in number segments.
   - `Z` $\leftrightarrow$ `2` in number segments.
   - `S` $\leftrightarrow$ `5` in number segments.
   - `B` $\leftrightarrow$ `8` in number segments.
3. **1.10x Confidence Multiplier**: Plate candidates that fully satisfy the Indian Standard regex receive an automatic 10% boost in temporal voting consensus.
