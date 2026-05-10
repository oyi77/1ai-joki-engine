# src/api - Express API Server

**Purpose:** Express.js server setup and configuration.

## FILES

| File | Purpose |
|------|---------|
| `server.ts` | Server creation, middleware wiring, DB init, queue status sync |
| `server.status-sync.test.ts` | Tests for campaign status sync via queue events |

## KEY RESPONSIBILITIES

- Creates Express app with helmet, cors, JSON parsing
- Initializes SQLite database (with sql.js WASM fallback)
- Wires BullMQ/EventEmitter queue with `wireCampaignStatusSync()`
- Starts HTTP server on configured `API_PORT`

## MIDDLEWARE STACK

1. `helmet()` — security headers
2. `cors()` — cross-origin support
3. `express.json()` — JSON body parsing
4. Request logging (Winston)
5. Route handlers under `/v1/*`
6. JWT auth (per-route, in route files)

## NOTES

- `middleware/` directory is empty — JWT handled in individual route files
- Fallback to sql.js (WASM) when `better-sqlite3` native module fails to load
- Server entry point: `src/index.ts` → calls `startServer()`
- Campaign status updates are atomic (FIX #7: uses transaction)