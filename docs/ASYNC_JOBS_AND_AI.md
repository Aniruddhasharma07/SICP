# Asynchronous Jobs & AI Safety Architecture

## 1. BullMQ & Redis Queue Pipeline
AI processing and notifications do not block synchronous HTTP requests:
```
Express API -> QueueManager -> BullMQ Queue -> Worker -> FastAPI AI Service -> Gemini
```

### Dependency Failure Rule
- If Redis is unavailable, queue-dependent operations return machine-readable error: `DEPENDENCY_UNAVAILABLE` (HTTP 503).
- The system never silently pretends that an asynchronous job succeeded.
- HTTP server endpoints (/healthz, /readyz, challenges, auth) continue to respond resiliently.

## 2. Real AI Integration & Strict No-Fake Rule
- Production AI communicates with FastAPI service backed by the **Gemini 2.5 Flash** model via Google GenAI SDK.
- **No Simulated AI in Production**: If `GEMINI_API_KEY` is not set or Gemini is unreachable, the system returns status `AI_UNAVAILABLE`. Simulated scores or mock text are strictly prohibited in production environments.
- **Configurable Confidence Gating**: Output confidence is evaluated against domain thresholds (`DEFAULT_CONFIDENCE_THRESHOLD = 0.80`). Low confidence or high-stakes categories (`SEVERE`, `CATASTROPHIC`) automatically flag `requiresHumanReview: true`.