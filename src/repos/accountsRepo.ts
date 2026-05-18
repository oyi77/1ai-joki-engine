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

  private getDatabase(): DB {
    return this.db ?? getDb()
  }

  create(a: Omit<Account, 'id' | 'created_at'>): Account {
    const id = randomUUID()
    const db = this.getDatabase()
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
      // sql.js fallback — use prepared statement to prevent SQL injection
      try {
        db.prepare(
          `INSERT INTO accounts (id, platform, display_name, credentials_encrypted, created_at) VALUES (?, ?, ?, ?, datetime('now'))`
        ).run(id, a.platform, a.display_name ?? null, String(a.credentials_encrypted))
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
    const db = this.getDatabase()
    const row = db
      .prepare(
        'SELECT id, platform, display_name, credentials_encrypted, created_at FROM accounts WHERE id = ? LIMIT 1'
      )
      .get(id)
    return row ?? null
  }

  list(): Account[] {
    const db = this.getDatabase()
    return db
      .prepare(
        'SELECT id, platform, display_name, credentials_encrypted, created_at FROM accounts ORDER BY created_at DESC'
      )
      .all()
  }

  update(id: string, patch: Partial<Pick<Account, 'platform' | 'display_name' | 'credentials_encrypted'>>): boolean {
    const db = this.getDatabase()
    const existing = db.prepare('SELECT id FROM accounts WHERE id = ? LIMIT 1').get(id)
    if (!existing) return false
    const fields: string[] = []
    const values: unknown[] = []
    if (patch.platform !== undefined) { fields.push('platform = ?'); values.push(patch.platform) }
    if (patch.display_name !== undefined) { fields.push('display_name = ?'); values.push(patch.display_name) }
    if (patch.credentials_encrypted !== undefined) { fields.push('credentials_encrypted = ?'); values.push(patch.credentials_encrypted) }
    if (fields.length === 0) return false
    values.push(id)
    const result = db.prepare(`UPDATE accounts SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return result.changes > 0
  }

  delete(id: string): boolean {
    const db = this.getDatabase()
    const existing = db.prepare('SELECT id FROM accounts WHERE id = ? LIMIT 1').get(id)
    if (!existing) return false
    const res = db.prepare('DELETE FROM accounts WHERE id = ?').run(id)
    return res.changes > 0
  }
}
