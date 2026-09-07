# Operational Tuning & Configuration Guide

---

## Tuning CPU vs GPU Throughput

### On CPU Environments:
- `tracking.track_buffer`: Set to `300` (prevents track fragmentation).
- `frame_skip`: Computed dynamically as `max(2, int(fps / 4))` (approx 4 FPS sampling).
- `ocr.enable_mkldnn`: Set to `False` in PaddleOCR initialization.

### On GPU Environments:
- Set `half=True` on `VehicleDetector` for FP16 inference.
- Reduce `frame_skip` to `1` (process every frame at 30 FPS).
- Set `tracking.track_buffer` to `60`.
