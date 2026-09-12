# Reusable State Machine Engine Specification

## 1. Challenge Lifecycle in Phase 1
The Phase 1 state machine manages the foundational verification lifecycle:

```
[DRAFT]
   │ (Citizen submits)
   ▼
[SUBMITTED]
   │ (Government Officer claims)
   ▼
[UNDER_GOV_REVIEW] ──────────┐
   │                         │ (Officer requests info with reason)
   │                         ▼
   │                  [NEEDS_MORE_INFO]
   │                         │ (Citizen resubmits)
   │                         ▼
   │                  [SUBMITTED]
   │
   ├─────────────────────────┐
   ▼                         ▼
[APPROVED]               [REJECTED]
(Ready for Phase 2       (Terminal with mandatory
 University matching)     administrative reason)
```

## 2. Enforcement Rules
1. **Server-Side Authority**: Transitions are strictly validated server-side by `StateMachineEngine`.
2. **Atomic Transactions**: The status change, version increment, timeline creation, audit log entry, and submitter notification execute inside a single Prisma transaction (`prisma.$transaction`).
3. **Optimistic Concurrency Control**: Uses an integer `version` field. If `expectedVersion` does not match `current.version`, throws `RESOURCE_VERSION_CONFLICT` (409) rather than overwriting concurrent work.
4. **Mandatory Reasons**: Transitions to `NEEDS_MORE_INFO` and `REJECTED` strictly require an explicit textual justification.