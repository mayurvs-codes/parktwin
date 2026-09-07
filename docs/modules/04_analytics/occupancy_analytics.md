# Occupancy Analytics (`modules/analytics/occupancy/`)

Computes spatial capacity utilization over configurable historical windows ($1\text{h}$, $24\text{h}$, $7\text{d}$, $30\text{d}$).

---

## Key Formulas

### 1. Real-Time Occupancy Rate
$$\text{Occupancy Rate} = \frac{\sum \text{Occupied Slots}}{\text{Total Registered Slots}}$$

### 2. Time-Weighted Average Occupancy
$$\bar{O} = \frac{1}{T} \int_{0}^{T} O(t) \, dt \approx \frac{1}{N} \sum_{i=1}^{N} \text{Occupancy}_i$$
