# OCR Engine & Image Enhancement (`modules/vehicle_recognition/ocr/`)

The OCR subsystem extracts alphanumeric license plate text using a dual-engine architecture (**PaddleOCR** primary with **EasyOCR** fallback) and specialized image pre-processing.

---

## Image Pre-Processing Pipeline (`enhancer.py`)

```mermaid
graph TD
    Raw[Raw Plate Crop] --> Resize[Lanczos-4 Resize to 640x128]
    Resize --> EV{detect_plate_type: Green/Black Plate?}
    EV -->|Yes| Invert[Invert Plate Color Space]
    EV -->|No| Gray[Grayscale Conversion]
    Invert --> Gray
    Gray --> CLAHE[Adaptive CLAHE Contrast Enhancement]
    CLAHE --> Binarize[Niblack Local Adaptive Binarization]
    Binarize --> Denoise[Morphological Opening & Gaussian Blur]
    Denoise --> OCR[Pass to OCREngine]
```

---

## Multi-Crop OCR Perturbation

To guarantee high OCR accuracy on vibrating cameras or angled plates, `OCREngine` generates 4 variants per plate:
1. **Tight Bounding Box**: Exact detected text boundary.
2. **5% Padding Expansion**: Adds context around edge characters (`K`, `A`, `0`, `9`).
3. **10% Padding Expansion**: Captures full border of Indian HSRP plates.
4. **$\pm 5^\circ$ Rotation Correction**: Rectifies angled camera views.

The engine scores all predictions and selects the highest confidence text string matching the Indian Standard grammar.
