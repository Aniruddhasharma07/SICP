# SICP Proactive Community Sentinel — Model & Societal Invariants

## 1. Executive Summary

The **Proactive Community Sentinel** is an active inference and citizen-engagement subsystem within SICP. Traditional civic platforms are purely reactive: they wait for angry citizens to complain. When an infrastructure failure happens, complaints flood in from the epicenter, but adjacent zones remain silent.

The Sentinel reverses this asymmetry:
When a systemic incident is detected on Branch A, the Sentinel **proactively reaches out** to registered residents on parallel Branch B to determine whether the utility service is functioning normally or failing silently.

---

## 2. The Non-Leading Inquirer Invariant

A leading question corrupts the data:
- ❌ **Leading (Prohibited)**: *"Are you experiencing low water pressure or dry taps today?"* (Invites confirmation bias, suggestive response).
- ✅ **Neutral (Enforced)**: *"How is your tap water supply operating right now?"* (Objective, unbiased options: Normal pressure / Low pressure / No water / Discolored or contaminated / Unsure).

```json
{
  "probeType": "WATER_PRESSURE",
  "neutralQuestion": "How is your household tap water supply currently functioning?",
  "options": [
    "Normal flow and pressure",
    "Noticeably lower pressure than usual",
    "Completely dry / No water",
    "Water has discoloration or odor",
    "Cannot verify at this moment"
  ]
}
```

---

## 3. Targeted Geographic & Topological Dispatch

Probes are **never blasted to the entire city**. They are precisely targeted based on infrastructure network topology:

1. **Unaffected Branch Probes**: Dispatched to registered citizens along parallel branches fed by the same upstream junction.
2. **Downstream Perimeter Probes**: Dispatched to zones immediately downstream of an suspected valve or junction to confirm the outer failure boundary.
3. **Control Zone Probes**: Dispatched to completely unrelated utility zones as a statistical control baseline.

---

## 4. Response Aggregation & Statistical Thresholding

To prevent a single anomalous response from distorting government intelligence:
- **Minimum Response Quorum**: At least 3 independent citizen responses must be recorded for a zone before a branch status transition is triggered.
- **Majority Agreement Ratio**: At least 70% of responses must report `NORMAL` for a branch to be classified as `OBSERVED_NORMAL`.
- **Epistemic Class**: Aggregated sentinel responses are classified with the `COMMUNITY` epistemic class (weight $0.70\times$), distinct from physical SCADA telemetry (`DIRECT`, $1.0\times$).

---

## 5. Societal Value: Active Community Stewardship

By involving citizens in non-emergency baseline reporting:
1. Municipal authorities receive real-time topological feedback within minutes.
2. Citizens feel heard and valued as active stewards of municipal infrastructure rather than passive victims of service disruptions.
3. False alarms and panic are prevented by verifying normal status across uninvolved sectors.
