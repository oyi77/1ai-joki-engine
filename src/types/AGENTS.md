# src/types - Shared Type Definitions

**Purpose:** Centralized TypeScript type definitions shared across modules.

## FILES

| File | Purpose |
|------|---------|
| `jobs.ts` | Job types: `PostJob`, `ReplyJob`, `CommentJob`, `ChatJob`, `Job` |
| `targets.ts` | Target types for blast operations |
| `db.ts` | Database type aliases (`DB`, table row types) |
| `better-sqlite3.d.ts` | Type declarations for better-sqlite3 |
| `sqljs.d.ts` | Type declarations for sql.js (WASM fallback) |
| `supertest.d.ts` | Type declarations for supertest (E2E tests) |

## CONVENTIONS

- `db.ts` contains core database type interfaces
- Job types define the shape of queue payloads
- `.d.ts` files provide ambient declarations for third-party modules
- Types are kept flat (no deep nesting) for clarity

## NOTES

- `DB` type is `any` — better-sqlite3 doesn't ship proper TypeScript types
- New platform-specific types should be added to `jobs.ts` or a new file in this directory
- `targets.ts` defines `Target` (phone number, username, etc.) used by blast runner