# scripts - Utility & Debug Scripts

**Purpose:** Development, debugging, and maintenance scripts for the blast engine.

## SCRIPTS

| Script | Purpose |
|--------|---------|
| `db-init.ts` | Initialize SQLite database and run migrations |
| `db-validate.ts` | Validate database schema and connectivity |
| `seed-db.ts` | Populate test database with sample data |
| `validate-config.js` | Validate required environment variables |
| `dev-start.js` | Development server launcher (cross-platform) |
| | |
| **Facebook scripts** ||
| `fb-auto-bot.ts` | Automated Facebook interaction bot |
| `test-fb.ts` | Facebook integration test |
| `test-fb-notifications.ts` | Facebook notification test |
| `test-fb-notif-adapter.ts` | Notification adapter test |
| `test-fb-notif-gql.ts` | Notification GraphQL test |
| `test-fb-home.ts` | Facebook home page test |
| `test-fb-search.ts` | Facebook search test |
| `test-gql.ts` | GraphQL endpoint test |
| `fetch-fb-html.ts` | Fetch Facebook HTML for analysis |
| `fetch-fb-search.ts` | Facebook search HTML fetcher |
| `fetch-fb-search-posts.ts` | Fetch Facebook search post results |
| `fetch-m-fb.ts` | Fetch mobile Facebook pages |
| `parse-fb-state.ts` | Parse Facebook state from HTML |
| `parse-m-fb.ts` | Parse mobile Facebook HTML |
| `parse-search-html.ts` | Parse Facebook search HTML |
| `playwright-fb-gql.ts` | Playwright GraphQL exploration |
| `print-js-query.ts` | Extract JS queries from FB pages |
| `print-js-search-query.ts` | Extract search queries from FB |
| `find-docid.ts` | Find Facebook document IDs |
| `find-docid-search.ts` | Find doc IDs in search results |
| `mbasic-test.ts` | Mobile basic Facebook test |
| `test-m-fb.ts` | Mobile Facebook test |
| `test-mbasic-action.ts` | Mobile basic action test |
| `debug-fb-notif.ts` | Debug Facebook notifications |
| `extract-fb-notifs.ts` | Extract notification data |
| `test-fb.ts` | Facebook test harness |
| | |
| **Database queries** ||
| `query-jobs.js` | Query job queue data |
| `pw-fb-test.ts` | Playwright Facebook test |

## CONVENTIONS

- TypeScript scripts use `ts-node` (registered in package.json scripts)
- JS scripts run directly with Node
- Facebook scripts use Playwright for browser automation
- Test scripts are for development/debugging, not production

## NOTES

- Most FB scripts relate to cookie-based auth development
- `dev-start.js` handles cross-platform server startup
- `validate-config.js` is used in CI/CD pipelines
- `db-init.ts` is called via `npm run db:init`