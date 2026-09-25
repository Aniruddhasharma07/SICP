# SICP Forensic UX & Information Architecture Audit
## Architectural Blueprint for Complete Frontend Transformation

**Date**: September 25, 2026  
**Status**: Execution Baseline Approved  
**Target Application**: Societal Innovation Collaboration Portal (SICP)  
**Production Frontend**: [https://sicp-frontend-zeta.vercel.app](https://sicp-frontend-zeta.vercel.app)  
**Production Backend**: [https://sicp-backend-production.up.railway.app](https://sicp-backend-production.up.railway.app)  
**Production AI Service**: [https://sicp-ai-production.up.railway.app](https://sicp-ai-production.up.railway.app)  

---

## 1. Executive Summary & Core Diagnosis

SICP contains sophisticated backend engines: deterministic systemic scoring (7 epistemic factors), cycle-safe infrastructure graph traversal (LCA detection), Branch Differential analysis, proactive community sentinel probes, Richards Heuer Analysis of Competing Hypotheses (AMCH v1.0), and institutional Solution Memory (Section 22).

However, the previous frontend presentation suffered from critical structural shortcomings:
1. **Feature Directory Fallacy**: Navigation forced users to understand the backend architecture (`AI`, `Root Cause`, `Sentinel`, `Infrastructure`, `Solution Memory`, `University`, `Industry`) before knowing what to do.
2. **Visual Fragmentation & Triple-Header Stack**: An `AppHeader` ($64\text{px}$) + `PortalShellHeader` ($72\text{px}$) + page header stack consumed over $200\text{px}$ of vertical space on desktop and disoriented users across portal switches.
3. **Cognitive Overload for Everyday Citizens**: Intake was a 7-step wizard requiring citizens to understand technical categories, severity tiers, and SLA expectations before submitting a basic issue like muddy tap water.
4. **Monolithic Page Debt**: Key operational pages (`government/page.tsx` at 3,313 lines, `university/page.tsx` at 2,443 lines) mixed triage queues, complex registration forms, review modals, and tables in single unmanageable monoliths.
5. **Terminology Disconnect**: Unexplained academic and technical jargon ("AMCH", "LCA", "Topologically Refuted", "Industry Sanctions") created confusion rather than institutional trust.

### The Governing Axiom
> **"Every capability appears at the moment it becomes useful."**
> **"Simple on the surface. Deep underneath."**

---

## 2. The 6-Level Information Depth Hierarchy

To prevent feature dumping while preserving technical depth for forensic experts, the entire interface is restructured into 6 progressive disclosure tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│ LEVEL 1 — SIMPLE (Everyday Citizen & Public)                           │
│ "What happened?"                                                       │
│ Clear civic plain language: issue received, verified on map.           │
├────────────────────────────────────────────────────────────────────────┤
│ LEVEL 2 — DISCOVERY (Community Monitor & Field Worker)                 │
│ "What did SICP find?"                                                  │
│ Scent of intelligence: related complaints, shared neighborhood pattern.│
├────────────────────────────────────────────────────────────────────────┤
│ LEVEL 3 — EVIDENCE (Municipal Officer & Triage Desk)                   │
│ "Why does SICP say that?"                                              │
│ Observable facts: matching timestamps, symptom overlap, spatial km.    │
├────────────────────────────────────────────────────────────────────────┤
│ LEVEL 4 — EXPLANATION (Systemic Investigator & Department Lead)        │
│ "Why is this relationship relevant?"                                   │
│ Contextual reasoning: upstream feeder branch, parallel unaffected zone.│
├────────────────────────────────────────────────────────────────────────┤
│ LEVEL 5 — TECHNICAL (Senior Executive Engineer & University PI)        │
│ "How was it computed?"                                                 │
│ Algorithmic proof: Richards Heuer AMCH matrix, LCA graph node MBR-02.  │
├────────────────────────────────────────────────────────────────────────┤
│ LEVEL 6 — AUDIT & PROVENANCE (Statutory Authority & Public Auditor)   │
│ "What exact source, computation, version, and sign-off record support?"│
│ Cryptographic trace: GIS vector dataset ID, Officer credentials, IP.   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Terminology Translation & Demystification Table

| Legacy / Backend Jargon | Beginner-Friendly Translation (Level 1–3) | Progressive Disclosure Label (Level 4–6) |
|---|---|---|
| **AMCH Analysis** | Competing Explanations | Richards Heuer Analysis of Competing Hypotheses (AMCH v1.0) |
| **LCA Node** | Shared Upstream Utility Source | Lowest Common Ancestor (Graph Node MBR-02) |
| **Topologically Refuted** | Weakened by Evidence | Inconsistent with Downstream Observations ($E^-$ penalty) |
| **Systemic Failure (S_sys $\ge$ 0.70)** | Shared Infrastructure Issue Detected | Systemic Score $\ge 0.70$ (Weighted Multi-Factor Heuristic) |
| **Industry Sanctions** | Industry Collaboration & Resource Opportunities | CSR Project Co-Funding & Commercialization Sanctions |
| **Sentinel Inquiry** | Proactive Community Verification Probe | Stratified Control Inquiry for Branch Differential Isolation |
| **Solution Memory** | How We Solved Similar Issues Before | Institutional Vector Experience Ledger (Section 22) |
| **Missing Evidence** | Awaiting Ground Telemetry | `UNKNOWN / UNOBSERVED` Epistemic State |

---

## 4. Complete Epistemic Model Preservation

Every piece of data, badge, and card in SICP must visibly reflect its epistemic origin:

1. `OBSERVED`: Citizen tap report, physical water clarity photograph, field acoustic reading.
2. `COMPUTED`: Spatial radius calculation, symptom text correlation percentage ($94\%$).
3. `SOURCE-DERIVED`: Official Municipal GIS vector lines, PHED pipeline registry.
4. `INFERRED`: Catchment boundary approximations when GIS pipe lines are unavailable.
5. `AI-INTERPRETED`: Gemini semantic extraction of civic symptoms and urgency.
6. `HYPOTHESIZED`: Richards Heuer competing failure modes under evaluation.
7. `HUMAN-VALIDATED`: Official Government Executive Engineer sign-off stamp.
8. `VERIFIED_OUTCOME`: Post-intervention civic inspection confirming tap water pressure restored.
9. `UNKNOWN / UNOBSERVED`: Truthful acknowledgment of absent data (never "nothing happened").

---

## 5. Route-by-Route Transformation & Completion Matrix

All 22 Next.js routes are audited and assigned their transformed purpose:

| # | Route | Current Defect / Bottleneck | Transformed Experience | Primary User | Single Dominant Action |
|---|---|---|---|---|---|
| **1** | `/` | Cluttered dashboard clone | Self-Revealing Civic Landing Portal | All Users | "Report a Problem" or "Explore Intelligence" |
| **2** | `/challenges/new` | 7-step wizard friction | Streamlined 3-Part Intake Journey | Citizen | Submit & Watch SICP Understand |
| **3** | `/challenges` | Flat unprioritized table | Civic Problem Explorer | Public | Track Community Issue |
| **4** | `/challenges/[id]` | Fragmented cards & dead ends | 4-Questions Problem Detail | Citizen / Officer | Upvote / Verify Outcome |
| **5** | `/dashboard` | Generic complaint table | Citizen Command Center | Citizen | Track My Reports / Verify Impact |
| **6** | `/government` | 3,313-line unprioritized queue | Triage & Investigation Command Center | Municipal Officer | Review Systemic Alerts / Triage SLA |
| **7** | `/government/systemic-intelligence` | Secondary buried hub | Systemic Command Radar | Officer / Investigator | Investigate Active Systemic Cluster |
| **8** | `/government/systemic-intelligence/[id]` | Heavy technical view | Guided AMCH Investigation Dossier | Executive Engineer | Validate Leading Hypothesis as Official |
| **9** | `/university` | 2,443-line academic grant list | Applied R&D & Faculty Matching Cockpit | Faculty PI / Dean | Explore Research Opportunity / Submit Proposal |
| **10** | `/industry` | Partner directory | Intervention & CSR Commercialization | Corporate / MSME | Review Deployment Brief / Commit CSR |
| **11** | `/projects` | Basic project list | Field Intervention & Pilot Tracker | Field Engineer | Monitor Remediation Milestones |
| **12** | `/projects/[id]` | Monolithic detail view | Intervention Cockpit & Telemetry Verification | Project Lead | Sign Off Milestone / Verify Outcome |
| **13** | `/solutions` | Isolated search database | "SICP Remembers" Institutional Memory | All Users | Search Historical Precedents |
| **14** | `/solutions/[id]` | Detail article | Institutional Lesson & Failure Record | Researcher / Engineer | Adopt Solution Strategy |
| **15** | `/map` | Standalone map view | Geospatial Infrastructure Radar | Public / Officer | Inspect Geographic Clusters |
| **16** | `/analytics` | Unstructured charts | Executive Institutional Telemetry | Leadership | Export Official Report |
| **17** | `/audit` | Table | Tamper-Evident Authority Audit Ledger | Auditor / Citizen | Verify Officer Sign-Off Record |
| **18** | `/admin` | Administration list | Platform Governance & Directory | Super Admin | Manage Municipal Roles |
| **19** | `/search` | Basic search | Universal Intelligence Search | All Users | Search Across All Entities |
| **20** | `/login` | Form | Unified Institutional Authentication | All Users | Sign In / Switch Demo Persona |
| **21** | `/register` | Generic form | Accredited Organization Registration | Partner / Academic | Register Organization |
| **22** | `/organizations` | Unsorted list | Accredited Partner Directory | Government / Public | Review Accreditation Ratings |

---

## 6. Protected Workflows & Regression Invariants (Zero-Regression)

1. **University Institution Switching (`demoSwitch`)**:
   - `University A` $\rightarrow$ `University B` $\rightarrow$ `University C` within `/university`.
   - Must reload active organization credentials, ratings, AISHE code, NAAC grade, and matched R&D calls without page reload or auth failure.
2. **Industry Partner Switching (`demoSwitch`)**:
   - `Partner A` $\rightarrow$ `Partner B` $\rightarrow$ `Partner C` within `/industry`.
   - Must reload company profile, capabilities, CSR budget, and intervention matches without auth failure.
3. **Government Authority Boundary (Invariant #1)**:
   - System cannot auto-validate root causes; only `Er. Rajesh Varma` (or authenticated Government Officer) has statutory sign-off authority.
4. **Dynamic Assessment Calculation**:
   - Branch Differential updates reflect real backend computation; no hardcoded findings in reusable components.
5. **Calibrated Fallbacks**:
   - Missing GIS lines display: *"Infrastructure topology unavailable; catchment-based relationship is an inference."* tagged `INFERRED`.
   - Failed/Delayed AI calls expose truthful error states without blocking already-saved work.

---

## 7. Execution Priority Sequence

- **Phase 1**: Design System Tokens (`globals.css`), Primitives (`Drawer.tsx`, `EvidenceChip.tsx`, refined `ui/*`).
- **Phase 2**: Global Shell & Unified Navigation (`AppLayout.tsx`, `AppHeader.tsx`, `Sidebar.tsx`, `MobileNav.tsx`).
- **Phase 3**: Core Intelligence Primitives (`ExplainWhy.tsx`, `IntelligenceTrace.tsx`, `GuidedInvestigationCard.tsx`).
- **Phase 4**: Citizen Journey (`page.tsx`, `challenges/new/page.tsx`, `dashboard/page.tsx`, `challenges/[id]/page.tsx`).
- **Phase 5**: Government Investigation & AMCH Dossier (`government/page.tsx`, `systemic-intelligence/*`).
- **Phase 6**: University Applied R&D (`university/page.tsx`).
- **Phase 7**: Industry CSR & MSME Deployment (`industry/page.tsx`).
- **Phase 8**: Project Intervention & Solution Memory (`projects/*`, `solutions/*`).
- **Phase 9**: Elite Motion Language & Accessibility (`globals.css`).
- **Phase 10**: Coherence Pass, Negative Testing & Live Vercel Production Deployment.
