# License Plate Detection (`modules/vehicle_recognition/plate_detection/`)

The `PlateDetector` locates license plate regions inside vehicle crops using multi-scale text-region detection.

---

## DBNet FPN Architecture & 32-Pixel Stride Alignment

PaddleOCR's DBNet text detector uses Feature Pyramid Networks (FPN) with downsampling stages. The convolutions require tensor spatial dimensions to be exact multiples of 32.

> **Crucial Optimization Note**:
> If an arbitrary crop size (e.g. $147 \times 49$) is passed to DBNet, oneDNN / MKL-DNN raises a shape broadcast mismatch (`Operands could not be broadcast together with shape X = [1, 96, 80, 160] and Y = [1, 96, 48, 160]`).
> ParkTwin enforces **32-pixel stride alignment** before detection:
> ```python
> target_w = ((target_w + 31) // 32) * 32
> target_h = ((target_h + 31) // 32) * 32
> scaled_img = cv2.resize(img, (target_w, target_h), interpolation=cv2.INTER_LANCZOS4)
> scaled_img = np.ascontiguousarray(scaled_img)
> ```

---

## Multi-Scale Detection Pyramid

To reliably detect both small, distant plates and close-up bumper plates, candidate crops are processed across 3 scale factors:

| Scale Factor | Target Resolution | Target Distance |
| :---: | :---: | :--- |
| **0.75x** | $480 \times 96$ | Close-up vehicle directly in front of camera |
| **1.00x** | $640 \times 128$ | Standard entry/exit lane distance (3–6 meters) |
| **1.25x** | $800 \times 160$ | Distant parking bay vehicle (6–12 meters) |

Overlapping plate candidate boxes across scales are merged using **IoU Non-Maximum Suppression (threshold 0.45)**.
