# migrations - Database Migrations

**Purpose:** SQL schema migrations for SQLite database using sequential numbered files.

## FILES

| File | Description |
|------|-------------|
| `001_init.sql` | Core tables: accounts, runtime_settings |
| `001_create_core_tables.sql` | Canonical core tables (may supersede 001_init) |
| `002_add_template_type.sql` | Add template_type column to templates |
| `003_create_runtime_settings.sql` | Runtime settings table (encrypted values) |
| `004_create_campaigns.sql` | Campaign + campaign_post tables |
| `005_create_link_clicks.sql` | Link click tracking table |
| `006_create_leads.sql` | Lead capture table |

## CONVENTIONS

- Numbered sequentially: `NNN_descriptive_name.sql`
- Each migration is idempotent where possible (uses `IF NOT EXISTS`)
- Run via `npm run db:init` (calls `scripts/db-init.ts`)
- `.gitkeep` preserved in directory for empty state

## NOTES

- Two `001_` files exist — `db-init.ts` determines which to apply
- Schema is still evolving; new migrations added as features require
- Test DB uses same migration set via `db:init`