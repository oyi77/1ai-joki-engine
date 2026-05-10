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
- Auth: JWT middleware on API routes (`src/middleware/auth.ts`)
- Response format: `{ data: ..., error?: ... }`
- Facebook/Instagram: cookie-based auth (no OAuth token required)
- Each platform adapter implements `IAdapter` (`connect`, `sendMessage`, `disconnect`, `getRateLimitStatus`)

## Completion Status (2026-05-11)

### Wave 1 — Foundation
- ✅ Fixed TypeScript type errors (`@types/node`, `"lib": ["ES2020", "DOM"]` in tsconfig)
- ✅ Added `twitter-api-v2` dependency for Twitter/X API
- ✅ Added `jsonwebtoken` dependency for JWT auth
- ✅ Removed orphaned `jest.config.js`
- ✅ Implemented JWT auth middleware (`src/middleware/auth.ts`)
- ✅ Fixed `.gitignore` for WAL/GitHub artifacts
- ✅ Replaced placeholder rate limiting in Twitter adapter with `RateLimiter`
- ✅ Cleaned up `docs/reports/` binary artifacts

### Wave 2 — Features
- ✅ Extracted 8 blast action files (`facebook-comment`, `facebook-dm`, `instagram-comment`, `instagram-dm`, `threads-comment`, `twitter-comment`, `whatsapp-send`, `telegram-send`)
- ✅ Wired multi-platform action routing in `blast-runner.ts`
- ✅ Filled empty Twitter adapter stubs (`post.ts`, `comment.ts`, `reply.ts`)
- ✅ Archived stale `docs/planning/plan.md`

### Wave 3 — Quality
- ✅ Added JWT integration test (`src/middleware/auth.integration.test.ts`)
- ✅ Added e2e blast test (`src/routes/blast-e2e.test.ts`)
- ✅ TypeScript compiles clean (0 errors via `tsc --noEmit`)
- ✅ ESLint passes (0 errors, pre-existing warnings in `.d.ts` files suppressed via overrides)

### Wave 4 — Infrastructure
- ✅ Created `.github/workflows/ci.yml`
- ✅ Created `docker-compose.override.yml`
- ✅ Created `Dockerfile.test` for containerized testing
- ✅ Updated `.eslintrc.json` with overrides for `.d.ts` and `.test.ts` files

### Verification
- **TypeScript:** 0 errors (`npx tsc --noEmit`)
- **ESLint:** 0 errors (`npx eslint src/ --max-warnings 0`)
- **Tests:** 174 passed across 34 test files (`npm test`)
- **No TODO/FIXME markers** in production code
- **No binary files** tracked in git

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