# src/scheduler - Cron & Facebook Scheduler

**Purpose:** Scheduled job execution and Facebook-specific post scheduling.

## FILES

| File | Purpose |
|------|---------|
| `cron-scheduler.ts` | Cron-based job trigger |
| `facebookScheduler.ts` | Facebook Posts API scheduling (native FB scheduler) |

## NOTES

- Cron scheduler uses node-cron for time-based triggers
- Facebook scheduler uses Graph API publish endpoint with `scheduled_publish_time`
- See ADR-0004 for Facebook Graph API v19 migration impact on scheduling