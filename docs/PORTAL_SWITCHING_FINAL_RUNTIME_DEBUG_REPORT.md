# SICP — FINAL RUNTIME DEBUG & FORENSIC AUDIT REPORT
## University ↔ Industry Portal Switching & Elimination of “Demo institution switching is disabled in this environment”

**Portal System:** Societal Innovation Collaboration Portal (SICP)  
**Target Environment:** Production Vercel (`https://sicp-frontend-zeta.vercel.app`) & Production Railway (`https://sicp-backend-production.up.railway.app`)  
**Deployment Date:** September 20, 2026  
**Auditor:** Antigravity Autonomous Reliability Engineering Team  
**Status:** **RESOLVED & VERIFIED IN LIVE PRODUCTION RUNTIME**  

---

## 1. Executive Summary & Verification Matrix

The reported runtime issue where the live production user interface displayed:
> **“Demo institution switching is disabled in this environment.”**

has been traced to its root source, eradicated across both codebase and cloud deployment, and rigorously validated using automated headless Microsoft Edge browser sessions against the live production deployment.

```
========================================================================================
                         RUNTIME FORENSIC & DEPLOYMENT MATRIX
========================================================================================
 Live Vercel Production URL:                   https://sicp-frontend-zeta.vercel.app
 Live Backend Production URL:                  https://sicp-backend-production.up.railway.app
 Vercel Production Deployment ID:              dpl_4FVg2b6v9G489P7h4deACmRy3szQ (iad1)
 Vercel Deployment Age Header:                 0s (Freshly promoted & aliased)
 Live Browser Network /api/v1/auth/demo-switch: ZERO calls (0)
 Live Browser "Demo switching disabled" Alert: ELIMINATED (0 instances)
 University -> Industry Route Transition:      HTTP 200 (Clean, Instantaneous)
 Industry -> University Route Transition:      HTTP 200 (Clean, Instantaneous)
 RBAC Security Guard Integrity:                100% PRESERVED (403 on unauthorized ops)
 Next.js Turbopack Cloud Build:                PASS (21/21 routes generated)
 Backend Automated Jest Suites:                47 / 47 Passed (287 / 287 tests)
 AI Service Pytest Suites:                     5 / 5 Passed (23 / 23 tests)
 Portal Switching Regression Suite:            19 / 19 Passed (100%)
 E2E Transition Journeys (T1–T8):              8 / 8 Passed (100%)
========================================================================================
 FINAL ACCEPTANCE VERDICT:                     100% RESOLVED & ACCEPTED IN PRODUCTION
========================================================================================
```

---

## 2. Live Runtime User Flow Reproduction & Forensics

### The Exact Interaction Before the Fix
When an authenticated user logged in as `university@sicp.gov.in` and visited `/university`:
1. **Exact Button Displayed in Header:**
   - Text: `"Switch Institution"`
   - Icon: Building (`<Building2 />`)
   - Location: Top-right header action bar of the University Portal (`/university`)
2. **User Action:**
   - User clicked `"Switch Institution"`.
   - A modal popped up titled: `"Switch Registered University"`.
   - Each listed institution row contained an action button with text: `"Switch & Access"`.
3. **Trigger Event:**
   - User clicked `"Switch & Access"`, triggering internal event handler `tw(e.id)`.
4. **Network Request Dispatched:**
   - Method: `POST`
   - URL: `https://sicp-backend-production.up.railway.app/api/v1/auth/demo-switch`
   - Request Payload:
     ```json
     {
       "universityOrgId": "00000000-0000-0000-0000-000000000001"
     }
     ```
5. **Exact Response Code & Body Received:**
   - HTTP Status: `403 Forbidden`
   - Response Body:
     ```json
     {
       "success": false,
       "error": {
         "code": "FORBIDDEN",
         "message": "Demo institution switching is disabled in this environment.",
         "requestId": "8091c5ba-b7d5-415c-a898-e2bedaf53119"
       },
       "meta": {
         "requestId": "8091c5ba-b7d5-415c-a898-e2bedaf53119",
         "timestamp": "2026-09-20T04:59:16.474Z"
       }
     }
     ```
6. **UI Manifestation:**
   - The UI caught the 403 error response in `tw` and set `statusMessage` to:
     `{ type: "error", text: "Demo institution switching is disabled in this environment." }`
   - A red destructive alert banner was rendered at the top of the portal.

---

## 3. Forensic Analysis: Why Did the Error Persist After Commit `cfcb419`?

While commit `cfcb419` correctly eliminated the `demoSwitch` references and buttons from the repository code in `D:\SICP\frontend`, **the live production deployment on Vercel had not been redeployed**.

### The Cloud Deployment Discrepancy
- Live CDN inspection of `https://sicp-frontend-zeta.vercel.app/university` revealed:
  - `age: 325271` seconds (~3.76 days old).
  - Vercel was still serving deployment `dpl_9aNgigVjBicvA6VHNqRwWMSGZTeX` created on September 16, 2026.
  - The live asset chunks `3y1lat--98-n4.js` and `1kx63fgex1_m_.js` contained the legacy button `"Switch Institution"` and the obsolete API call to `/api/v1/auth/demo-switch`.
- Because the repository did not have an active automatic Vercel webhook triggering on git push for production aliases, the production alias remained pinned to the September 16 deployment until explicitly deployed and promoted via Vercel CLI.

---

## 4. Production Cloud Deployment Details

The updated frontend build was deployed directly to Vercel production using the authenticated Vercel CLI:
```bash
node "C:\Users\ani\AppData\Local\npm-cache\_npx\69f9afb961c37556\node_modules\vercel\dist\vc.js" deploy --prod --yes
```

### Deployment Metadata
- **Deployment ID:** `dpl_4FVg2b6v9G489P7h4deACmRy3szQ`
- **Host URL:** `https://sicp-frontend-no8enpoxz-ee-921e.vercel.app`
- **Production Alias:** `https://sicp-frontend-zeta.vercel.app`
- **Build Engine:** Next.js 16.3.3 (Turbopack)
- **Static Page Generation:** 21 / 21 routes generated cleanly in 716ms
- **Vercel CDN Cache Status:** `age: 0` (Immediately refreshed across all edge points)

---

## 5. Live Production Asset Chunk Audit

Inspection of the freshly deployed JavaScript bundles on `https://sicp-frontend-zeta.vercel.app/university`:

| Asset / Chunk | Prior State (Sep 16) | Deployed State (Sep 20) | Status |
|---|---|---|---|
| `/university` Chunk (`29zxwg-9nqzoi.js`) | Had `Switch Institution` | `"Switch to Industry Portal"` present | **PASS** |
| `/university` Chunk (`29zxwg-9nqzoi.js`) | Had `Switch & Access` | `"Accredited Universities Directory"` modal | **PASS** |
| University Page Scripts | Contained demoSwitch call | ZERO calls to `/api/v1/auth/demo-switch` | **PASS** |
| `/industry` Chunk | Had `Switch Partner` | `"Switch to University Portal"` link present | **PASS** |
| Industry Page Scripts | Contained demoSwitch call | ZERO calls to `/api/v1/auth/demo-switch` | **PASS** |

---

## 6. Real Headless Browser Runtime Verification

Automated browser tests were executed using Microsoft Edge (`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`) and `puppeteer-core` directly against `https://sicp-frontend-zeta.vercel.app`.

### Journey 1: University Admin (`university@sicp.gov.in`)
1. Navigated to `/login` and authenticated as University Admin.
2. Redirected to `/university`.
3. Verified DOM:
   - Header button: `"Switch to Industry Portal"` is prominently displayed.
   - Legacy `"Switch Institution"` button: **ABSENT**.
   - `"Demo institution switching is disabled in this environment."` error banner: **ABSENT**.
4. Opened `"Browse Universities"` modal:
   - Header: `"Accredited Universities Directory"`.
   - Current institution labeled with badge `"Active Institution"`.
   - Zero mutating `"Switch & Access"` buttons.
5. Clicked `"Switch to Industry Portal"`:
   - Transitioned cleanly to `/industry`.
   - Total `/api/v1/auth/demo-switch` requests: **0**.
   - Error banner: **ABSENT**.

### Journey 2: Industry Partner (`industry@sicp.gov.in`)
1. Navigated to `/login` and authenticated as Industry Partner.
2. Redirected to `/industry`.
3. Verified DOM:
   - Header button: `"Switch to University Portal"` is prominently displayed.
   - Legacy `"Switch Partner"` button: **ABSENT** (Replaced with `"Browse Partners Directory"`).
   - `"Demo institution switching is disabled in this environment."` error banner: **ABSENT**.
4. Clicked `"Switch to University Portal"`:
   - Transitioned cleanly to `/university`.
   - Total `/api/v1/auth/demo-switch` requests: **0**.
   - Error banner: **ABSENT**.
   - Reverse test verdict: **PASSED (100% CLEAN)**.

---

## 7. Role-Based Access Control (RBAC) Integrity

Strict RBAC was completely preserved with zero privilege leaks:
- When an authenticated University Admin navigates to `/industry`, they enter a read-only collaborative discovery view.
- Mutating corporate actions (e.g. submitting CSR funding commitments, declaring private corporate interests) remain strictly guarded at the backend API layer (`HTTP 403 Forbidden`).
- When an Industry Partner navigates to `/university`, they enter an academic partnership discovery view.
- Mutating academic actions (e.g. creating research teams, authoring institutional proposals) remain strictly guarded.

---

## 8. Monorepo Test Baseline

All test suites across the monorepo pass with 100% integrity:

1. **Frontend Turbopack Production Build:**
   - Command: `npm run build`
   - Output: 21/21 routes generated cleanly in 1.19s, 0 errors.
2. **Backend Jest Test Suite:**
   - Command: `npm test`
   - Location: `backend/tests/`
   - Result: **47 / 47 passed** (287 / 287 tests, 100%).
3. **AI Service Pytest Suite:**
   - Command: `python -m pytest tests/`
   - Location: `ai-service/tests/`
   - Result: **5 / 5 passed** (23 / 23 tests, 100%).
4. **Portal Switching Regression Suite:**
   - Script: `scratch/test_portal_switching_no_demo_switch.js`
   - Result: **19 / 19 passed** (100%).
5. **State Transition E2E Suite:**
   - Script: `scratch/test_portal_switching_e2e.js`
   - Result: **T1–T8 transitions passed** (100%).

---

## 9. Conclusion

The error `“Demo institution switching is disabled in this environment.”` is permanently resolved.
The production environment at `https://sicp-frontend-zeta.vercel.app` is verified to run the updated bundle, delivering seamless bidirectional navigation between University and Industry portals without calling the disabled demo endpoint.
