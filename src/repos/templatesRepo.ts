import { DB, getDb } from '../db/sqlite'
import { randomUUID } from 'crypto'

export type Template = {
  id: string
  name: string
  content: string
  variables?: string[]
  type: string
  created_at?: string
  updated_at?: string
}

export class TemplatesRepo {
  db?: DB

  constructor(db?: DB) {
    // Lazy resolve DB to avoid forcing initialization during module import
    this.db = db
  }

  private getDatabase(): DB {
    return this.db ?? getDb()
  }

  create(input: { name: string; content: string; variables?: string[]; type: string }): Template {
    const id = randomUUID()
    const vars = input.variables ? JSON.stringify(input.variables) : JSON.stringify([])
    const db = this.getDatabase()
    const isSqlJs = !!(db && (db as unknown as { __isSqlJs?: boolean })?.__isSqlJs)
    if (db.prepare && !isSqlJs) {
      db.prepare(
        `INSERT INTO templates (id, name, content, variables, type) VALUES (?, ?, ?, ?, ?)`
      ).run(id, input.name, input.content, vars, input.type)
    } else {
      // sql.js fallback — use prepared statement to prevent SQL injection
      db.prepare(
        `INSERT INTO templates (id, name, content, variables, type, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`
      ).run(id, input.name, input.content, vars, input.type)
    }
    return {
      id,
      ...input,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  list(): Template[] {
    const db = this.getDatabase()
    const rows = db
      .prepare(
        'SELECT id, name, content, variables, created_at, type FROM templates ORDER BY created_at DESC'
      )
      .all() as Record<string, unknown>[]
    return rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      content: r.content as string,
      variables: r.variables ? JSON.parse(r.variables as string) : [],
      type: r.type as string,
      created_at: r.created_at as string | undefined,
      updated_at: r.updated_at as string | undefined,
    }))
  }

  findById(id: string): Template | null {
    const db = this.getDatabase()
    const r = db
      .prepare(
        'SELECT id, name, content, variables, created_at, type FROM templates WHERE id = ? LIMIT 1'
      )
      .get(id) as Record<string, unknown> | undefined
    if (!r) return null
    return {
      id: r.id as string,
      name: r.name as string,
      content: r.content as string,
      variables: r.variables ? JSON.parse(r.variables as string) : [],
      type: r.type as string,
      created_at: r.created_at as string | undefined,
      updated_at: r.updated_at as string | undefined,
    }
  }

  update(id: string, patch: Partial<Pick<Template, 'name' | 'content' | 'variables' | 'type'>>): boolean {
    const db = this.getDatabase()
    const existing = db.prepare('SELECT id FROM templates WHERE id = ? LIMIT 1').get(id)
    if (!existing) return false
    const fields: string[] = []
    const values: unknown[] = []
    if (patch.name !== undefined) { fields.push('name = ?'); values.push(patch.name) }
    if (patch.content !== undefined) { fields.push('content = ?'); values.push(patch.content) }
    if (patch.variables !== undefined) { fields.push('variables = ?'); values.push(JSON.stringify(patch.variables)) }
    if (patch.type !== undefined) { fields.push('type = ?'); values.push(patch.type) }
    if (fields.length === 0) return false
    values.push(id)
    const result = db.prepare(`UPDATE templates SET ${fields.join(', ')} WHERE id = ?`).run(...values)
    return result.changes > 0
  }

  delete(id: string): boolean {
    const db = this.getDatabase()
    const res = db.prepare('DELETE FROM templates WHERE id = ?').run(id)
    return res.changes > 0
  }
}
