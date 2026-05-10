# src/queue - Job Queue & Rate Limiting

**Purpose:** Background job processing with retry policies, rate limiting, and BullMQ (optional) support.

## STRUCTURE
```
queue/
├── job-queue.ts          # Main JobQueue class (EventEmitter-based, BullMQ fallback)
├── rate-limiter.ts       # Per-platform rate limit tracking
├── retry.ts              # Retry/backoff logic
├── retry-policies.ts     # Platform-specific retry policies
├── job-worker.ts (../workers) # Consumer that processes jobs via adapters
```

## KEY FILES

| File | Lines | Purpose |
|------|-------|---------|
| `job-queue.ts` | ~204 | In-memory queue with optional BullMQ; emits completed/failed events |
| `rate-limiter.ts` | — | Token-bucket rate limiter per platform |
| `retry.ts` | — | Exponential backoff + jitter |
| `retry-policies.ts` | — | Platform-specific: max attempts, backoff base, retryable errors |

## CONVENTIONS

- `JobQueue extends EventEmitter` — consume via `queue.on('completed', ...)`
- Uses `async-mutex` Mutex (not boolean flag) for atomic processing (FIX #2)
- In-memory queue for dev/testing; BullMQ for production (Redis optional)
- DLQ (dead-letter queue) exposed as `queue.dlq` array

## TEST FILES

- `job-queue.test.ts`
- `rate-limiter.test.ts`
- `retry.test.ts`

## NOTES

- Campaign status sync wired in `server.ts` via queue events
- Rate limiter enforces per-platform delays between actions
- Retry policies differ by platform (Facebook more aggressive backoff)