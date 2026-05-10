# PROJECT KNOWLEDGE BASE

**Generated:** Tue May 05 2026
**Commit:** [NOT AVAILABLE]
**Branch:** [UNDETECTED]

## OVERVIEW

Production-focused Node.js/TypeScript blast engine with Next.js dashboard, SQLite persistence, and platform adapters for WhatsApp, Telegram, Instagram, Twitter/X, Threads, and Facebook Pages.

---

## STRUCTURE
```
root/
├ src/                    # Backend API, queue, workers, repos
│ ├ api/                  # Server entry point
│ ├ routes/               # Express endpoints
│ ├ repos/                # Data access layer
│ ├ queue/                # Job queue (bullmq-based)
│ ├ scheduler/            # Cron scheduling
│ ├ blast/                # Core blast engine
│ ├ workers/              # Background job workers
│ └ db/                   # SQLite configuration
├ dashboard/              # Next.js UI (port 3001)
└ tests/                  # Integration & unit tests
```

---

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| API endpoints | `src/routes/*.ts` | REST API under `/v1/*` |
| Database models | `src/repos/*.ts` | SQLite via better-sqlite3 |
| Job queue | `src/queue/job-queue.ts` | BullMQ-based |
| Blast engine | `src/blast/blast-runner.ts` | Core posting logic (473 lines) |
| Dashboard | `dashboard/app/page.tsx` | Next.js SPA |

---

## CONVENTIONS

- **Runtime**: Node.js `20.20.x` (required for better-sqlite3)
- **Testing**: Vitest in `src/routes/*.test.ts`
- **Auth**: JWT-based, secrets via `.env` + SQLite
- **Credentials**: Cookie-based posting supported (FB/Insta/Threads/Twitter)
- **Encryption**: AES-256-GCM for stored credentials

---

## COMMANDS
```bash
npm run db:init        # Initialize SQLite + migrations
npm run dev:api        # Start API (ts-node)
npm test               # Run Vitest suite
npm run validate:config # Config validation
```

---

## NOTES

- Dashboard runs on `http://localhost:3001`
- Job execution resolves adapters from stored accounts
- WAHA preferred WhatsApp path
- Facebook uses cookie-based auth (no Page Access Token required)