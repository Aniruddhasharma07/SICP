# SICP System Architecture - Phase 1 Elite Foundation

## 1. Executive Overview
The Societal Innovation Collaboration Portal (SICP) is a unified societal ecosystem engineered to bridge citizens, government departments, universities, and industry partners to systematically report, validate, research, and solve civic and societal challenges.

Phase 1 establishes the production-grade architectural and engineering foundation without premature vertical slice implementation.

## 2. Monorepo Structure
```
D:\SICP\
├── shared/                         # Domain enums, contracts, DTOs, and state machine types
│   ├── src/
│   │   ├── enums/                  # 15 Stakeholder roles, ChallengeStatus, VerificationStatus
│   │   ├── contracts/              # ApiResponse<T>, ApiError, ZeroDeadEndState
│   │   └── types/                  # Typed DTOs for User, Org, Challenge, Timeline, Audit
├── backend/                        # Node.js + Express + TypeScript + Prisma
│   ├── prisma/                     # PostgreSQL schema (prepared for pgvector/PostGIS)
│   ├── src/
│   │   ├── config/                 # Zod validated environment variables
│   │   ├── core/                   # Security, request ID, error handler, rate limiters, RBAC
│   │   ├── database/               # Prisma client singleton
│   │   ├── domain/                 # Reusable State Machine engine & RBAC permission matrix
│   │   ├── modules/                # Domain slices: auth, organization, challenge, evidence, audit, notification
│   │   ├── jobs/                   # BullMQ queue manager and worker handlers
│   │   └── utils/                  # Winston logger, response helpers, AppErrors
│   └── tests/                      # Automated Jest test suite (37 tests, 100% pass rate)
├── frontend/                       # Next.js 16.3.3 + React 19.2.8 + Tailwind CSS v4 + shadcn/ui
│   ├── app/                        # App Router pages (Home, Login, Register, Challenges)
│   └── src/
│       ├── components/             # Reusable UI primitives, ZeroDeadEndNotice, Header, Sidebar
│       ├── lib/                    # apiClient, AuthContext, permissions hook
├── ai-service/                     # FastAPI + Python service with Gemini adapter
│   ├── app/                        # Pydantic schemas, Gemini client, ConfidencePolicy
│   └── tests/                      # Pytest unit tests for schemas and confidence gating
├── infrastructure/                 # Docker Compose with PostgreSQL 16 (PostGIS) & Redis 7
└── docs/                           # Architecture, API Conventions, RBAC, Runbook
```

## 3. Workflow-First Principle
Every important action traverses the strict layered flow:
```
User Action
  → Authentication Middleware (JWT verification)
  → RBAC Authorization Middleware (Permissions matrix check)
  → Payload Validation (Zod schema)
  → Controller & Domain Service
  → StateMachineEngine (valid transition verification & reason check)
  → Atomic Database Transaction (Prisma $transaction with optimistic concurrency)
  → Timeline & Audit Event Recording
  → Event-driven Notification Dispatch
  → Standardized API Response
  → Updated UI State with Zero-Dead-End Guidance
```

## 4. Phase 1 Boundaries
- **Proven Roles**: Citizen, Government Officer, University Admin, System Admin.
- **Phase 1 States**: `DRAFT` → `SUBMITTED` → `UNDER_GOV_REVIEW` → `NEEDS_MORE_INFO` → `APPROVED` and `UNDER_GOV_REVIEW` → `REJECTED`.
- **Deferred to Phase 2+**: University matching engine, industry funding pipeline, prototype tracking, vector duplicate clustering, Solution Memory.