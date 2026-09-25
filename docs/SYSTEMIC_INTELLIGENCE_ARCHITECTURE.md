# SICP Systemic Intelligence Subsystem & Proactive Community Sentinel — Architecture

## 1. System Overview

The **Systemic Intelligence Subsystem** elevates SICP from an isolated citizen complaint-handling portal into an evidence-driven, institutionally governed civic infrastructure intelligence platform. It connects scattered civic problem signals to underlying infrastructure networks, generates evidence-backed competing root-cause hypotheses, dispatches unbiased community sentinel probes, and empowers authoritative human governance.

```
+-----------------------------------------------------------------------------------+
|                        SICP SYSTEMIC INTELLIGENCE SUBSYSTEM                       |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [Civic Complaints & Sensor Signals]                                              |
|                    │                                                              |
|                    ▼                                                              |
|  ┌────────────────────────────────────────────────────────┐                       |
|  │  1. Deterministic Systemic Scoring Engine (7 Factors)  │                       |
|  │     - Dynamic re-normalization (sum of available weights)                      |
|  │     - Epistemic classification: DIRECT, DERIVED, INFERRED                      |
|  │     - Category threshold: SYSTEMIC_FAILURE (S_sys >= 0.70)                     |
|  └────────────────────────┬───────────────────────────────┘                       |
|                           │                                                       |
|                           ▼                                                       |
|  ┌────────────────────────────────────────────────────────┐                       |
|  │  2. Directed, Cycle-Safe Infrastructure Graph Engine   │                       |
|  │     - Physical utility topology (Water, Power, Telecom)                        |
|  │     - Lowest Common Ancestor (LCA) upstream lineage    │                       |
|  │     - Downstream impact projection (4 states)          │                       |
|  │     - Alternative feed / bypass detection              │                       |
|  └────────────────────────┬───────────────────────────────┘                       |
|                           │                                                       |
|                           ▼                                                       |
|  ┌────────────────────────────────────────────────────────┐                       |
|  │  3. Branch Differential Analysis                       │                       |
|  │     - Compare affected branch vs. parallel branch      │                       |
|  │     - Check physical bypasses and alternative feeds    │                       |
|  │     - Modulates diagnostic confidence (never naive 0%) │                       |
|  └────────────────────────┬───────────────────────────────┘                       |
|                           │                                                       |
|                           ▼                                                       |
|  ┌────────────────────────────────────────────────────────┐                       |
|  │  4. Proactive Community Sentinel Inquiries             │                       |
|  │     - Neutral, non-leading micro-probes                │                       |
|  │     - Stratified civic validation (Unaffected zones)   │                       |
|  │     - Statistical thresholding (>= 3 responses)        │                       |
|  └────────────────────────┬───────────────────────────────┘                       |
|                           │                                                       |
|                           ▼                                                       |
|  ┌────────────────────────────────────────────────────────┐                       |
|  │  5. Richards Heuer AMCH Evidence Matrix                │                       |
|  │     - Multi-hypothesis competing evaluation            │                       |
|  │     - Supporting (E+), Inconsistent (E-), Neutral (E?) │                       |
|  │     - Falsification criteria: "What would change assessment?"                  |
|  │     - Strict heuristic support (not probability)       │                       |
|  └────────────────────────┬───────────────────────────────┘                       |
|                           │                                                       |
|                           ▼                                                       |
|  ┌────────────────────────────────────────────────────────┐                       |
|  │  6. Government Command Center & Audited Governance     │                       |
|  │     - 24-point interactive Root Cause Dossier          │                       |
|  │     - Human Officer sign-off & dispatch authority      │                       |
|  │     - Closed loop to University R&D & Industry CSR     │                       |
|  └────────────────────────────────────────────────────────┘                       |
+-----------------------------------------------------------------------------------+
```

---

## 2. Core Invariants & Governance Principles

1. **AI = Understanding, Algorithms = Computation, Rules = Governance, Humans = Final Authority**:
   - Machine models and graph traversals propose hypotheses; they never execute authoritative changes without a verified government officer's explicit action.
2. **Fundamental Causality Invariant**:
   - Correlation / proximity / common upstream $\neq$ confirmed root cause.
   - Hypotheses remain labeled `HYPOTHESIS` until an authorized Government Officer explicitly validates them.
3. **Branch Differential Invariant**:
   - If Branch A reports failure but Branch B (originating from the same upstream junction) reports normal service, the root cause is **less likely** to be upstream of the junction, **unless** Branch B has an alternative feed or bypass.
   - The system drops confidence proportionally; it does not set it to 0% unless topology physically guarantees impossibility.
4. **Epistemic Honesty Invariant**:
   - Evidence is strictly typed by provenance: Direct observation, Sensor telemetry, Community response, Derived inference.
   - Missing data dynamically re-normalizes weights rather than hallucinating default zeroes.
5. **Neutral Inquirer Invariant**:
   - Proactive Community Sentinel probes are strictly non-leading. They never suggest a problem exists.
6. **Zero Fabrication Invariant**:
   - No fake citizen reports, synthetic telemetry, or simulated field confirmations are injected into live databases.
   - Controlled demonstration scenarios are prominently tagged with `"CONTROLLED DEMO SCENARIO — NOT LIVE GOVERNMENT DATA"`.

---

## 3. Database Schema Entities

Eight additive Prisma models provide relational persistence:
- `SystemicIncident`: Aggregates related civic problem signals and infrastructure nodes.
- `InfrastructureNode`: Directed graph node representing physical assets (Reservoir, Feeder, Junction, Valve).
- `InfrastructureEdge`: Directed graph edge with edge types (`TRANSMISSION`, `DISTRIBUTION`, `FEEDER`, `BYPASS`, `BACKUP`).
- `SystemicIncidentSignal`: Polymorphic linkage connecting `Challenge` civic problems to a `SystemicIncident`.
- `IncidentNodeImpact`: Junction tracking node impact state (`OBSERVED_AFFECTED`, `POTENTIALLY_AFFECTED`, `OBSERVED_NORMAL`, `UNKNOWN`).
- `RootCauseHypothesis`: Heuer AMCH hypothesis with diagnostic score, status (`HYPOTHESIS`, `VALIDATED_BY_GOVERNMENT`, `REFUTED`, `FIELD_INVESTIGATION_REQUIRED`), and structured evidence items.
- `SentinelProbeRequest`: Non-leading citizen inquiry dispatched to citizens in targeted geographic zones.
- `SentinelProbeResponse`: Citizen responses tallied with verification confidence.

---

## 4. Frontend Command Center & Dossier

1. **Systemic Intelligence Hub** (`/government/systemic-intelligence`):
   - Executive metrics (Active Incidents, Total Nodes, Open Sentinel Probes, Validated Hypotheses).
   - Filterable incident list with epistemic gauges and status indicators.
   - Demonstration scenario banner for instant evaluator review.
2. **24-Point Root Cause Dossier** (`/government/systemic-intelligence/[id]`):
   - **Topology Visualizer**: SVG-based directed network diagram with 5 hierarchical levels, cycle-safety, and interactive node inspection.
   - **Heuer AMCH Matrix**: Side-by-side hypothesis comparison with $E^+$, $E^-$, $E^?$ evidence badges and falsification triggers.
   - **Sentinel Probe Widget**: Interactive citizen probe simulator with live response tallies and branch differential calculation.
   - **Executive Demo Stepper**: 5-step automated walkthrough demonstrating the full branch differential and AMCH workflow in 30–60 seconds.
   - **Government Action Center**: Formally validates hypotheses, dispatches field engineering teams, and initiates University R&D / Industry CSR intervention projects.
