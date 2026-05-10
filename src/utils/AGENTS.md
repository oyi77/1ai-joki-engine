# src/utils - Utility Modules

**Purpose:** Shared utility functions for crypto, HTTP, logging, tracking, and more.

## FILES

| File | Purpose |
|------|---------|
| `crypto.ts` | AES-256-GCM encrypt/decrypt for credentials + runtime settings |
| `http-client.ts` | Axios wrapper with retry and timeout defaults |
| `logger.ts` | Winston logger configuration (JSON format, configurable level) |
| `tracking.ts` | Link click tracking (UTM generation, redirect handler) |
| `randomTargets.ts` | Random target selection from list (for blast targeting) |

## CONVENTIONS

- Each utility is a single focused module
- `crypto.ts` handles all encryption — never encrypt manually elsewhere
- Logger uses Winston with JSON format; level from `LOG_LEVEL` env var
- `http-client.ts` wraps Axios with sensible defaults (timeouts, retries)

## TEST FILES

- `randomTargets.test.ts`

## NOTES

- `crypto.ts` encryption key derived from `JWT_SECRET` via SHA-256
- `http-client.ts` used by adapter HTTP calls (not Playwright-based)