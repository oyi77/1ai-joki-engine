# src/routes - API Endpoints

**Purpose**: Express REST API endpoints under `/v1/*`

## KEY FILES

| File | Lines | Description |
|------|-------|-------------|
| `accounts.ts` | ~100 | Account CRUD + credential management |
| `campaigns.ts` | ~127 | Campaign management |
| `blast.ts` | ~82 | Trigger blast operations |
| `jobs.ts` | ~160 | Job queue management |
| `posts.ts` | ~82 | Post creation |
| `templates.ts` | ~119 | Template management |
| `webhooks.ts` | ~115 | Inbound webhook handlers |
| `track.ts` | ~61 | Link tracking & stats |
| `adapters.ts` | — | Adapter registration + proxy |
| `settings.ts` | — | Runtime settings CRUD |

## TEST FILES

- `campaigns.test.ts`, `campaigns.integration.test.ts`
- `blast.test.ts`, `e2e.test.ts`
- `jobs.test.ts`, `accounts.test.ts`
- `templates.test.ts`, `track.test.ts`, `webhooks.test.ts`

## CONVENTIONS

- All routes prefixed with `/v1`
- Auth via JWT middleware
- Response format: `{ data: ..., error?: ... }`
- Error codes: `RATE_LIMIT_EXCEEDED`, `AUTH_EXPIRED`

## NOTES

- Job queue uses BullMQ with exponential backoff
- Facebook/Instagram use cookie-based auth (no token required)