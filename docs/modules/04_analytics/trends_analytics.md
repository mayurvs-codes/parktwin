# Trends & Statistical Percentiles (`modules/analytics/trends/`)

Computes non-parametric duration statistics across completed sessions to model long-tail stay distributions.

---

## Statistical Percentiles Table

| Metric | Meaning | Operational Use |
| :--- | :--- | :--- |
| **Mean (Average)** | Arithmetic average stay length | General revenue forecasting |
| **Median ($p_{50}$)** | 50% of vehicles stay less than this value | Baseline tariff window sizing |
| **$p_{25}$** | Short-stay threshold | Quick drop-off / delivery grace periods |
| **$p_{75}$** | Standard long-stay threshold | Daily commuter boundary |
| **$p_{90}$** | 90th percentile stay length | Extended overstay monitoring |
