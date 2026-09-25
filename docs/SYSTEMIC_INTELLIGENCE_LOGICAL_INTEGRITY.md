# SICP Systemic Intelligence Subsystem — Logical Integrity & Heuer AMCH Model

## 1. Richards Heuer Analysis of Competing Hypotheses (AMCH)

The Systemic Intelligence Subsystem adapts the cognitive methodology developed by Richards Heuer for intelligence analysis:
Instead of trying to find evidence that proves a single favorite hypothesis (which introduces confirmation bias), the engine systematically tracks evidence that **refutes** or **weakens** competing hypotheses.

### The Evidence Diagnostic Matrix

For each systemic incident, a set of exhaustive and mutually exclusive hypotheses $\{H_1, H_2, \dots, H_n\}$ is maintained:
- $H_1$: Common Upstream Transmission / Treatment Failure (e.g., Kolar Raw Water Main)
- $H_2$: Mid-Level Distribution Junction Failure (e.g., Sector-B Booster Pumping Station)
- $H_3$: Downstream Local Branch Leakage / Pipe Burst (e.g., Ward 44 Sub-feeder)
- $H_4$: Sensor / Telemetry Malfunction or Reporting Anomaly

Each piece of evidence $E_k$ receives a diagnostic evaluation for hypothesis $H_j$:
- **Consistent ($E^+$)**: The observation is expected if $H_j$ is true ($+1.0$).
- **Inconsistent ($E^-$)**: The observation contradicts or weakens $H_j$ ($-2.0$ penalty).
- **Neutral ($E^?$)**: The observation neither proves nor disproves $H_j$ ($0.0$).

---

## 2. Epistemic Support Calculation

The Heuristic Diagnostic Support Score is calculated as:

$$\text{DiagnosticScore}(H_j) = \max\left(5\%, \min\left(95\%, 50\% + 10 \cdot \sum_{k} \left( \mathbb{I}(E_{jk} = E^+) \cdot w_k - 2 \cdot \mathbb{I}(E_{jk} = E^-) \cdot w_k \right) \right)\right)$$

Where $w_k$ is the epistemic weight of the evidence ($1.0$ for DIRECT, $0.85$ for DERIVED, $0.70$ for COMMUNITY, $0.60$ for INFERRED).

> [!IMPORTANT]
> The score is explicitly labeled as a **Heuristic Diagnostic Support Score** (0–100%). It is NEVER misrepresented as a calibrated Bayesian probability of truth, because real-world civic systems operate under open-world epistemic uncertainty.

---

## 3. The Branch Differential Invariant

Consider an upstream junction $J$ feeding two downstream branches:
- Branch $A \to \text{Zone } 1$ (reporting zero water pressure)
- Branch $B \to \text{Zone } 2$ (reporting normal water pressure)

```
              [Upstream Water Treatment Plant]
                             │
                             ▼
                    [Junction J (Feeder)]
                           /      \
                          /        \
              [Branch A]              [Branch B]
                 │                       │
                 ▼                       ▼
           [Zone 1: FAILING]       [Zone 2: NORMAL]
```

### Logical Inference:
1. If the failure were at or upstream of Junction $J$, **both** Branch $A$ and Branch $B$ should experience water failure, **unless**:
   - Branch $B$ possesses an independent alternative feed or bypass.
   - Flow dynamics allow partial gravity feed to Branch $B$ only.
2. Therefore, when Branch $B$ is verified `NORMAL` by proactive sentinel probes:
   - Hypotheses placing the fault at or upstream of Junction $J$ receive an $E^-$ (Inconsistent) evidence item.
   - The diagnostic score for upstream hypotheses decreases proportionally (e.g., from 82% to 28%).
   - The score does **not** naively collapse to 0% unless an absolute physical bypass guarantee is topologically proven.
   - Downstream hypotheses (e.g., Branch $A$ valve failure or pipe burst) are simultaneously strengthened as the leading explanations.

---

## 4. Falsification Triggers ("What Would Change Our Assessment?")

In accordance with Heuer AMCH standards, each hypothesis in the Root Cause Dossier includes explicit, testable falsification conditions:
- **For Upstream Mains Hypothesis**: "If verified normal pressure is reported from Branch B (Arera Colony), this hypothesis is refuted."
- **For Booster Station Hypothesis**: "If telemetry confirms electrical power and motor RPM at Booster 4, this hypothesis is refuted."
- **For Local Branch Hypothesis**: "If multiple adjacent wards on other sub-feeders report identical pressure collapse, this hypothesis is refuted."
