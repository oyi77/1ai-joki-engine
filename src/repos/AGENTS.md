# src/repos - Repository Layer

**Purpose:** Data access layer using Repository pattern over SQLite. Each repo encapsulates table access and business logic for a domain entity.

## STRUCTURE
```
repos/
├── accountsRepo.ts       # Account CRUD + credential storage
├── campaignsRepo.ts      # Campaign + campaign_post management
├── jobsRepo.ts           # Job queue persistence
├── leadsRepo.ts          # Lead capture from link clicks
├── linkClicksRepo.ts     # Click tracking per post
├── postsRepo.ts          # Post scheduling + status
├── runtimeSettingsRepo.ts # Encrypted runtime config
└── templatesRepo.ts      # Content templates
```

## CONVENTIONS

- Each repo class lazily initializes its DB handle via `getDb()`
- Constructor accepts optional `DB` parameter for test injection
- Types exported alongside the repo class in the same file
- UUID primary keys (`randomUUID()`)
- Repos use getter pattern for lazy DB init (see accounts.ts for canonical example)

## KEY TYPES

| Repo | Main Type(s) |
|------|-------------|
| `accountsRepo` | `Account` — id, name, platform, credentials (encrypted) |
| `campaignsRepo` | `Campaign`, `CampaignPost` — id, name, content, platforms[], status |
| `jobsRepo` | `QueuedJob` — id, type, payload, status, attempts |
| `postsRepo` | `Post` — id, account_id, content, status, scheduled_at |
| `templatesRepo` | `Template` — id, name, content, category |
| `leadsRepo` | `Lead` — id, source, metadata, created_at |
| `linkClicksRepo` | `LinkClick` — id, post_id, clicked_at, ip |
| `runtimeSettingsRepo` | key-value pairs (values AES-256-GCM encrypted) |

## NOTES

- DB is `better-sqlite3` (synchronous) — repos run in the same process
- `runtimeSettingsRepo` encrypts values at rest using JWT_SECRET-derived key
- Test files use separate test DB via vitest setup