# Traffic Analytics (`modules/analytics/traffic/`)

Tracks the ingress and egress dynamics of vehicles across the parking facility.

---

## Metrics & Visualizations

1. **Hourly Influx/Outflux Histogram**: 24 bins representing hours `0` through `23`.
2. **Peak Hour Detection**:
   $$\text{Peak Hour} = \arg\max_{h \in [0, 23]} \left( \text{Entries}(h) + \text{Exits}(h) \right)$$
3. **Active Fleet In-Lot**: Net difference of $\sum \text{Entries} - \sum \text{Exits}$.
