# SICP Systemic Intelligence Subsystem — Data Sources & Epistemic Classification

## 1. Multi-Modal Data Ingestion

The Systemic Intelligence Subsystem aggregates data across heterogeneous municipal sources, assigning each piece of evidence an explicit **Epistemic Class**:

| Epistemic Class | Description | Reliability Weight Multiplier | Examples |
|---|---|---|---|
| `DIRECT` | Physical measurements or ground-truth observations | $1.0\times$ | Sensor telemetry (pressure gauges, flow meters), on-site field engineer inspection reports |
| `DERIVED` | Algorithmic or structural computations | $0.85\times$ | Lowest Common Ancestor (LCA) graph topology, network hydraulic modeling |
| `INFERRED` | Statistical or heuristic associations | $0.60\times$ | Spatial clustering, temporal burst correlation, historical recurrence signals |
| `COMMUNITY` | Citizen-reported observations | $0.70\times$ | Neutral sentinel probe responses, citizen complaint submissions |

---

## 2. Seven-Factor Deterministic Scoring Breakdown

The systemic score $S_{\text{sys}} \in [0, 1]$ is computed deterministically across seven dimensions:

$$S_{\text{sys}} = \frac{\sum_{i=1}^{7} w_i \cdot s_i}{\sum_{i \in \text{Available}} w_i}$$

1. **Spatial Proximity ($s_{\text{geo}}$, Weight = 0.20)**:
   - Evaluates Haversine distance between signal coordinates.
   - Decays smoothly as distance exceeds the local infrastructure footprint.
2. **Temporal Clustering ($s_{\text{time}}$, Weight = 0.15)**:
   - Quantifies the burstiness of complaints within a sliding window (e.g., 24–72 hours).
   - Differentiates sudden systemic failures from gradual isolated maintenance issues.
3. **Common Infrastructure Subtree ($s_{\text{infra}}$, Weight = 0.25)**:
   - Traces nodes up directed utility graphs to find shared ancestors (LCA).
   - High score when two or more failing consumer endpoints share an upstream distribution hub or feeder.
4. **Symptom / Category Consistency ($s_{\text{sym}}$, Weight = 0.15)**:
   - Evaluates whether reported complaints reflect identical or complementary failure modes (e.g., low pressure + dry taps vs. water quality + discoloration).
5. **Cross-Boundary Spread ($s_{\text{cross}}$, Weight = 0.10)**:
   - Rewards signals spanning multiple administrative wards or electoral districts.
   - Prevents local ward-level maintenance issues from misclassifying as city-wide systemic failures.
6. **Historical Failure Recurrence ($s_{\text{hist}}$, Weight = 0.08)**:
   - Queries historical solution memory and recurring maintenance records for chronic infrastructure failure precedents.
7. **Telemetry / Sensor Corroboration ($s_{\text{telem}}$, Weight = 0.07)**:
   - Directly checks physical telemetry alerts (e.g., SCADA pressure drops, power transformer temperature spikes).

---

## 3. Dynamic Re-Normalization Invariant

When telemetry or historical data is unavailable for a given geographic area, the scoring engine **does not substitute zero values**. Instead, it dynamically re-normalizes the score over the active factor weights:

$$W_{\text{active}} = \sum_{i \in \text{Available}} w_i \implies S_{\text{sys}} = \frac{\sum_{i \in \text{Available}} w_i \cdot s_i}{W_{\text{active}}}$$

This guarantees that sparse sensor coverage never penalizes citizen reports or masks genuine infrastructure emergencies.
