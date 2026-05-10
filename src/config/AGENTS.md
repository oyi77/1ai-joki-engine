# src/config - Configuration & Secrets

**Purpose:** Centralized configuration loading with validation and encrypted runtime settings.

## FILES

| File | Purpose |
|------|---------|
| `secrets.ts` | Config loader, validation, `AppConfig` type, encrypted runtime settings reader |
| `runtime-secret-store.ts` | Low-level encrypted key-value store in SQLite |

## REQUIRED ENV VARS

| Variable | Purpose |
|----------|---------|
| `DATABASE_PATH` | SQLite database file path |
| `API_PORT` | Express server port |
| `API_HOST` | Server bind address |
| `DASHBOARD_PORT` | Next.js dashboard port |
| `JWT_SECRET` | JWT signing + encryption key |
| `LOG_LEVEL` | Winston log level |

## OPTIONAL PLATFORM VARS

- `WHATSAPP_WEBJS_API_KEY` — WhatsApp Web.js
- `TELEGRAM_BOT_TOKEN` — Telegram bot
- `TWITTER_BEARER_TOKEN`, `TWITTER_API_KEY`, `TWITTER_API_SECRET` — Twitter API
- `INSTAGRAM_ACCESS_TOKEN` — Instagram (optional)
- Platform-specific tokens are per-account, stored in DB

## NOTES

- `runtime-secret-store.ts` reads encrypted values from `runtime_settings` table
- Encryption: AES-256-GCM with key derived from `JWT_SECRET`
- New optional platform tokens should be added to `AppConfig` type