# Slot Detection & Spatial Geometry (`modules/parking_intelligence/slot_detection/`)

The `SlotDetector` evaluates spatial overlap between detected vehicle bounding boxes and pre-calibrated parking slot polygons.

---

## Spatial Matching Logic

1. **Vehicle Footprint Projection**: Rather than using the entire vehicle bounding box (which includes windshield and roof perspectives), the detector calculates the **bottom-center contact patch**:
   $$P_{\text{contact}} = \left( \frac{x_1 + x_2}{2}, \; y_2 \right)$$
2. **Polygon Overlap & IoU**: Evaluates geometric intersection using `Shapely`:
   $$\text{IoU}(\text{Box}, \text{Slot}) = \frac{\text{Area}(\text{Box} \cap \text{Slot})}{\text{Area}(\text{Box} \cup \text{Slot})}$$
3. **Thresholding**:
   - $\text{IoU} \ge 0.35$ or $P_{\text{contact}} \in \text{Polygon}(\text{Slot}) \implies$ **Occupied by Track ID**.
   - $\text{IoU} < 0.10 \implies$ **Free / Unoccupied**.

---

## Slot Status Enumeration

| State | Color Code | Description |
| :--- | :---: | :--- |
| `FREE` | 🟢 Green | Available for parking; no vehicle detected |
| `OCCUPIED` | 🔴 Red | Vehicle currently stationed in bay |
| `RESERVED` | 🟡 Yellow | Dedicated for VIP / EV charging / Handled via API |
| `UNKNOWN` | ⚪ Grey | Camera feed obstructed or degraded |
