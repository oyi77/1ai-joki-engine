-- Update jobs table to include tracking columns
ALTER TABLE jobs ADD COLUMN updated_at TEXT;
ALTER TABLE jobs ADD COLUMN last_error TEXT;

-- Create logs table for detailed execution tracing if not exists
CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  meta TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
);
