# docs/decisions - Architecture Decision Records

**Purpose:** ADRs (Architecture Decision Records) documenting major design choices.

## DECISIONS

| ID | Title | Status | Key Detail |
|----|-------|--------|------------|
| 0001 | Dashboard blast flow ID | accepted | Dashboard triggers blasts via API with unique flow ID |
| 0002 | Worker uses stored accounts | accepted | Workers read credentials from DB, not env vars |
| 0003 | SQLite fallback | accepted | sql.js (WASM) fallback when better-sqlite3 unavailable |
| 0004 | Facebook Pages Graph v19 | accepted | Migration plan for Graph API v19 breaking changes |
| 0005 | Dashboard API base :3456 | accepted | Dashboard proxy config for API port |
| ADR-0006 | Facebook cookie auth | accepted | Replaced token-based with cookie-based FB auth |
| ADR-0007 | Blast runner architecture | accepted | Sequential single-platform blast execution |
| ADR-fix-bugs | Bug fixes | accepted | Collection of incremental fix decisions |

## FORMAT

Each ADR follows this structure:
- **Title** — short decision description
- **Status** — proposed / accepted / superseded / deprecated
- **Context** — problem being solved
- **Decision** — what was chosen
- **Consequences** — tradeoffs and implications

## NOTES

- Both numbered (0001-0007) and prefixed (ADR-0006+) naming conventions exist
- Some files have `-id.md` suffixes (redirect/alias files)
- English and Indonesian versions may exist for the same decision