# SICP Local Development Runbook

## Prerequisites
- **Node.js**: v20+ (Node v24.20.0 installed on host)
- **Docker & Docker Compose**: For local PostgreSQL + Redis
- **Python**: 3.11+ (for FastAPI `ai-service`)

## 1. Quick Start Commands

### Start Database & Cache (Docker)
```bash
docker compose -f infrastructure/docker-compose.yml up -d
```

### Install Dependencies & Build Packages
```bash
# Build shared contracts package
npm run build:shared

# Run Prisma client generation and database migrations
npm run prisma:generate --prefix backend

# Build backend and frontend
npm run build:backend
npm run build:frontend
```

### Run Automated Backend Tests
```bash
npm test --prefix backend
```
*Expected Result: 5 test suites pass, 37 tests pass with 100% success rate.*

### Start Services for Local Development
```bash
# Terminal 1: Backend Express API (port 5000)
npm run dev --prefix backend

# Terminal 2: Frontend Next.js 16.3.3 (port 3000)
npm run dev --prefix frontend

# Terminal 3: FastAPI AI Service (port 8000, optional when Python is installed)
cd ai-service && uvicorn app.main:app --port 8000 --reload
```

## 2. Verifying Endpoints
- Frontend: `http://localhost:3000`
- Backend Liveness: `http://localhost:5000/healthz`
- Backend Readiness: `http://localhost:5000/readyz`
- AI Service Health: `http://localhost:8000/health`