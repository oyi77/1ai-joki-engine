# Project Knowledge Base

**Generated:** 2026-05-11  
**Commit:** 34b4ff0  
**Branch:** main  
**Stack:** TypeScript, Express, SQLite, Next.js (dashboard)

## Overview
Social media automation engine for BerkahKarya — schedule posts, engagement automation, and content planning across WhatsApp, Telegram, Instagram, Twitter/X, Threads, and Facebook Pages.

## Structure
```
├── src/
│   ├── adapters/         # Platform adapters (IAdapter interface + providers)
│   ├── api/              # Express server + middleware
│   ├── blast/            # Blast orchestrator (multi-platform actions)
│   ├── config/           # Secrets, runtime settings
│   ├── db/               # SQLite init, migrations
│   ├── middleware/        # (empty — JWT handled in routes)
│   ├── queue/            # Job queue (in-memory + BullMQ fallback), rate limiter
│   ├── repos/            # Repository pattern (accounts, campaigns, jobs, etc.)
│   ├── routes/           # Express routers under /v1/*
│   ├── scheduler/        # Cron + Facebook scheduler
│   ├── types/            # Shared TypeScript types
│   ├── utils/            # Crypto, HTTP client, logger, tracking
│   └── workers/          # Background job processing
├── dashboard/            # Next.js dashboard (app router)
├── docs/                 # ADRs, design docs, planning (Indonesian + English)
├── scripts/              # DB init, FB scraping, debug tools
├── data/                 # Targets list, test DB
└── migrations/           # SQL schema migrations
```

## Where to Look
| Task | Location |
|------|----------|
| API entry point | `src/api/server.ts` |
| Platform adapters | `src/adapters/providers/{platform}/` |
| Adapter interface | `src/adapters/IAdapter.ts` |
| Blast logic | `src/blast/blast-runner.ts` |
| Job queue | `src/queue/job-queue.ts` |
| Repositories | `src/repos/*Repo.ts` |
| Dashboard | `dashboard/app/` (Next.js app router) |
| Config / secrets | `src/config/secrets.ts` |
| DB setup | `src/db/sqlite.ts` |
| API routes | `src/routes/*.ts` |
| Tests | Inline `*.test.ts` alongside source |
| Design decisions | `docs/decisions/` (ADRs) |

## Key Facts
- 109+ TypeScript source files, ~30 test files
- SQLite via `better-sqlite3` (native) with `sql.js` (WASM) fallback
- Job queue: in-memory EventEmitter-based + optional BullMQ (Redis)
- Auth: JWT middleware on API routes
- Response format: `{ data: ..., error?: ... }`
- Facebook/Instagram: cookie-based auth (no OAuth token required)
- Each platform adapter implements `IAdapter` (`connect`, `sendMessage`, `disconnect`, `getRateLimitStatus`)

## Conventions
- JSDoc on exported functions (not internal helpers)
- `FIX #N` comments track GitHub issues in code
- Routes prefixed `/v1`
- Repos use getter pattern for lazy DB init (see `accounts.ts`)
- Test files sit alongside source (`*.test.ts`)
- Config required vars: `DATABASE_PATH`, `API_PORT`, `API_HOST`, `DASHBOARD_PORT`, `JWT_SECRET`, `LOG_LEVEL`

## Commands
```bash
# Dev API
npm run dev:api

# DB init
npm run db:init

# Test
npm test
```

## Notes
- The `1ai-social` repo (Python) handles scheduling/content planning; this repo is the JS execution engine.
- `1ai-reach` (Python) is a separate reach/analytics tool.
- Facebook Graph API v19 migration is tracked in `docs/decisions/ADR-0004`.