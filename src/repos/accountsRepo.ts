import { DB, getDb } from '../db/sqlite'
import { randomUUID } from 'crypto'

export type Account = {
  id: string
  platform: string
  display_name?: string
  credentials_encrypted: Buffer | string
  created_at?: string
}

export class AccountsRepo {
  db?: DB

  constructor(db?: DB) {
    // Lazy resolve DB to avoid forcing initialization during module import
    this.db = db
  }

  create(a: Omit<Account, 'id' | 'created_at'>): Account {
    const id = randomUUID()
    const db = this.db ?? getDb()
    const isSqlJs = !!(db && (db as unknown as { __isSqlJs?: boolean })?.__isSqlJs)
    const stmt =
      !isSqlJs &&
      db.prepare?.(
        `INSERT INTO accounts (id, platform, display_name, credentials_encrypted) VALUES (?, ?, ?, ?)`
      )
    if (stmt && stmt.run && !isSqlJs) {
      try {
        stmt.run(id, a.platform, a.display_name ?? null, a.credentials_encrypted)
      } catch (err) {
        console.error('[AccountsRepo] stmt.run error', {
          id,
          platform: a.platform,
          display_name: a.display_name,
          err,
        })
        throw err
      }
    } else {
      // sql.js path (fallback) — use prepared statement if available
      try {
        db.exec(
          `INSERT INTO accounts (id, platform, display_name, credentials_encrypted, created_at) VALUES ('${id}', '${a.platform}', '${a.display_name ?? ''}', '${String(a.credentials_encrypted).replace(/'/g, "''")}', datetime('now'))`
        )
      } catch (err) {
        console.error('[AccountsRepo] exec error', {
          id,
          platform: a.platform,
          display_name: a.display_name,
          err,
        })
        throw err
      }
    }
    return { id, ...a, created_at: new Date().toISOString() } as Account
  }

  findById(id: string): Account | null {
    const db = this.db ?? getDb()
    const row = db
      .prepare(
        'SELECT id, platform, display_name, credentials_encrypted, created_at FROM accounts WHERE id = ? LIMIT 1'
      )
      .get(id)
    return row ?? null
  }

  list(): Account[] {
    const db = this.db ?? getDb()
    return db
      .prepare(
        'SELECT id, platform, display_name, credentials_encrypted, created_at FROM accounts ORDER BY created_at DESC'
      )
      .all()
  }

  delete(id: string): boolean {
    const db = this.db ?? getDb()
    const existing = db.prepare('SELECT id FROM accounts WHERE id = ? LIMIT 1').get(id)
    if (!existing) return false
    const res = db.prepare('DELETE FROM accounts WHERE id = ?').run(id)
    return res.changes > 0
  }
}
