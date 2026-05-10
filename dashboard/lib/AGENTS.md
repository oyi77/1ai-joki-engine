# dashboard/lib - Shared Dashboard Utilities

**Purpose:** Shared utilities, API client, type definitions, and React hooks for the Next.js dashboard.

## FILES

| File | Purpose |
|------|---------|
| `api.ts` | Axios instance with base URL from `NEXT_PUBLIC_API_BASE` |
| `hooks.ts` | Shared React hooks (useAccounts, useCampaigns, etc.) |
| `types.ts` | Dashboard type definitions (Account, Campaign, Job, etc.) |
| `constants.ts` | App-wide constants |
| `utils.ts` | Helper utilities |

## CONVENTIONS

- `api.ts` is the single HTTP client — all dashboard data fetching goes through it
- Types mirror backend types but may include UI-specific fields
- Hooks follow React Query / SWR patterns for data fetching and caching

## NOTES

- API base URL defaults to `http://127.0.0.1:3456` if not configured
- Types are kept flat for simplicity in the UI layer