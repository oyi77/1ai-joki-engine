# src/db - Database Layer

**Purpose:** SQLite database initialization with native better-sqlite3 and WASM fallback.

## FILES

| File | Purpose |
|------|---------|
| `sqlite.ts` | `initDatabase()`, `initSqlJsDatabase()`, `getDb()` — DB singleton |
| `migrations/` | (at repo root) SQL migration files |

## KEY TYPES

- `DB` type alias = `any` (better-sqlite3 doesn't ship proper TS types)
- Lazy singleton pattern: DB initialized once, reused globally

## NOTES

- Prefers `better-sqlite3` (native); falls back to `sql.js` (WASM)
- WAL journal mode enabled for concurrent reads
- `busy_timeout` set to 30s to handle contention
- Foreign keys enforced via pragma
- Migration scripts at `/migrations/`, run via `scripts/db-init.ts`