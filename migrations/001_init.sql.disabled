-- SQLite initialization SQL for joki-blast-engine
-- Tables use TEXT for IDs and DATETIME/INTEGER for timestamps as per guidelines

CREATE TABLE IF NOT EXISTS Accounts (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Templates (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables TEXT,
  type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (account_id) REFERENCES Accounts(id)
);

CREATE TABLE IF NOT EXISTS Jobs (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL,
  scheduled_at TEXT,
  started_at TEXT,
  completed_at TEXT,
  error_msg TEXT,
  retries INTEGER NOT NULL,
  max_retries INTEGER NOT NULL,
  FOREIGN KEY (template_id) REFERENCES Templates(id),
  FOREIGN KEY (account_id) REFERENCES Accounts(id)
);

CREATE TABLE IF NOT EXISTS Posts (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  post_url TEXT,
  engagement_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES Jobs(id),
  FOREIGN KEY (account_id) REFERENCES Accounts(id)
);

CREATE TABLE IF NOT EXISTS Schedules (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  cron_expr TEXT NOT NULL,
  enabled BOOLEAN NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (template_id) REFERENCES Templates(id),
  FOREIGN KEY (account_id) REFERENCES Accounts(id)
);

CREATE TABLE IF NOT EXISTS Credentials (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  type TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  expires_at TEXT,
  FOREIGN KEY (account_id) REFERENCES Accounts(id)
);

CREATE TABLE IF NOT EXISTS Logs (
  id TEXT PRIMARY KEY,
  job_id TEXT,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  context_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES Jobs(id)
);
