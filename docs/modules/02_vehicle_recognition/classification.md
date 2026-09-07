# Vehicle Attribute Classification (`modules/vehicle_recognition/classification/`)

Extracts vehicle type, brand manufacturer, and dominant body color.

---

## 1. Vehicle Type Classifier (`type_classifier.py`)
- **Deep Model**: MobileNetV3-Small fine-tuned on vehicle topologies.
- **Classes**: `Sedan`, `SUV`, `Hatchback`, `Van`, `Coupe`, `Motorcycle`, `Bus`, `Truck`.
- **YOLO Fallback**: If deep model confidence $< 0.40$, falls back to YOLO bounding box aspect ratio and geometry.

---

## 2. Brand Classifier (`brand_classifier.py`)
- **Deep Model**: EfficientNet-B0 backbone extracting 1280-dimensional feature embeddings.
- **Recognized Brands**: `Toyota`, `Hyundai`, `Honda`, `Maruti Suzuki`, `Tata`, `Mahindra`, `Kia`, `Volkswagen`, `BMW`, `Mercedes-Benz`, `Audi`, `Ford`, `Jeep`.

---

## 3. Color Recognizer (`color_recognizer.py`)
- **Method**: Central body crop (avoids windshield glass and black tires) transformed into **HSV color space**.
- **Histogram Quantization**: Computes median Hue, Saturation, and Value across 12 distinct centroid clusters:
  - `Black`, `White`, `Silver`, `Grey`, `Red`, `Blue`, `Green`, `Yellow`, `Orange`, `Brown`, `Gold`, `Purple`.
