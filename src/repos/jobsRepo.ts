import { DB, getDb } from "../db/sqlite";
import { randomUUID } from "crypto";

export type JobRow = {
  id: string;
  account_id?: string;
  platform?: string;
  type?: string;
  payload?: string;
  attempts?: number;
  max_attempts?: number;
  next_run_at?: string | null;
  status?: string;
  created_at?: string;
};

export class JobsRepo {
  db?: DB;

  constructor(db?: DB) {
    // Do not call getDb() at construction time to avoid initializing DB during
    // module import. Methods will resolve the DB lazily.
    this.db = db;
  }

  create(input: { account_id?: string; platform?: string; type?: string; payload?: unknown; max_attempts?: number; next_run_at?: string | null }): JobRow {
    const id = randomUUID();
    const payload = input.payload ? JSON.stringify(input.payload) : null;
    const db = this.db ?? getDb();
    if (db.prepare) {
      db.prepare(`INSERT INTO jobs (id, account_id, platform, type, payload, attempts, max_attempts, next_run_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, input.account_id || null, input.platform || null, input.type || null, payload, 0, input.max_attempts ?? 5, input.next_run_at || null, 'pending');
    } else {
      db.prepare(`INSERT INTO jobs (id, account_id, platform, type, payload, attempts, max_attempts, next_run_at, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`)
        .run(id, input.account_id || null, input.platform || null, input.type || null, payload, 0, input.max_attempts ?? 5, input.next_run_at || null, 'pending');
    }
    return { id, account_id: input.account_id ?? undefined, platform: input.platform ?? undefined, type: input.type ?? undefined, payload: payload ?? undefined, attempts: 0, max_attempts: input.max_attempts ?? 5, next_run_at: input.next_run_at ?? null, status: 'pending', created_at: new Date().toISOString() };
  }

  findById(id: string): JobRow | null {
    const db = this.db ?? getDb();
    const r = db.prepare(`SELECT * FROM jobs WHERE id = ? LIMIT 1`).get(id);
    return r ?? null;
  }

  listPending(): JobRow[] {
    const db = this.db ?? getDb();
    return db.prepare(`SELECT * FROM jobs WHERE status = 'pending' ORDER BY created_at ASC`).all();
  }

  markFailed(id: string, err: unknown) {
    const db = this.db ?? getDb();
    const errorMessage = err instanceof Error ? err.message : String(err);
    db.prepare(`UPDATE jobs SET status = 'failed', last_error = ? WHERE id = ?`).run(errorMessage, id);
  }

  markCompleted(id: string) {
    const db = this.db ?? getDb();
    db.prepare(`UPDATE jobs SET status = 'completed' WHERE id = ?`).run(id);
  }

  listAll(limit = 100): JobRow[] {
    const db = this.db ?? getDb();
    return db.prepare(`SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?`).all(limit);
  }
}
