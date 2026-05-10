# src/workers - Background Job Workers

**Purpose:** Background job processing that routes jobs to platform adapters.

## FILES

| File | Purpose |
|------|---------|
| `index.ts` | Worker entry point — starts job consumer |
| `job-worker.ts` | `Worker` class: dispatches jobs to adapters based on platform |

## KEY LOGIC

- `job-worker.ts` implements adapter factory pattern for testability
- Accepts `AdapterFactory` function: `(platform, context?) => IAdapter`
- Maps job types to adapter methods: post → `sendMessage`, comment → platform comment, etc.
- DI-friendly: tests inject mock adapter factories

## CONVENTIONS

- Worker imports all platform adapters explicitly (no dynamic require)
- Error handling: log and continue, never crash the worker
- Uses `JobQueue` from `src/queue` for job consumption

## NOTES

- Worker is started from `server.ts` via `initializeJobWorker(queue)`
- Each platform adapter must implement `IAdapter` interface
- New platforms: add adapter file in `adapters/providers/`, import in worker