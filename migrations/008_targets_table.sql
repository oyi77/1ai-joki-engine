CREATE TABLE IF NOT EXISTS targets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'post',
  value TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  account_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  metadata TEXT,
  UNIQUE(platform, target_type, value)
);

CREATE INDEX IF NOT EXISTS idx_targets_platform ON targets(platform);
CREATE INDEX IF NOT EXISTS idx_targets_source ON targets(source);
CREATE INDEX IF NOT EXISTS idx_targets_account_id ON targets(account_id);
