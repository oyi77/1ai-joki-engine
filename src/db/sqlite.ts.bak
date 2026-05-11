import fs from 'fs'
import path from 'path'

// This module prefers better-sqlite3 (native). If unavailable, the server may
// call `initSqlJsDatabase` to initialize a sql.js (WASM) backed DB instead.

export type DB = any

let _db: DB | null = null
let _isSqlJs = false

// Synchronous init for native better-sqlite3. Throws if module not available.
export function initDatabase(dbPath: string): DB {
  if (_db) return _db
  // Try to require better-sqlite3 synchronously
  let BetterSqlite3: any
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    BetterSqlite3 = require('better-sqlite3')
  } catch (err) {
    throw new Error('better-sqlite3 not available: ' + String(err))
  }

  const parent = path.dirname(dbPath)
  if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true })

  _db = new BetterSqlite3(dbPath, { readonly: false })
  _isSqlJs = false
  try {
    _db.pragma('journal_mode = WAL')
    // Increase busy timeout to reduce SQLITE_BUSY occurrences under contention
    _db.pragma('busy_timeout = 30000')
    _db.pragma('foreign_keys = ON')
  } catch (err) {
    console.warn('sqlite: failed applying pragmas', err)
  }

  return _db
}

// Async init using sql.js (WASM). Use when better-sqlite3 isn't available.
export async function initSqlJsDatabase(dbPath: string): Promise<DB> {
  if (_db) return _db
  // Create parent dir
  const parent = path.dirname(dbPath)
  if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true })

  // Load sql.js without TypeScript module resolution issues
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sqljs: any = require('sql.js')
  const initSqlJs = sqljs.default ?? sqljs.initSqlJs ?? sqljs
  // Ensure WASM file is located from the sql.js package distribution
  const sqlJsPath = path.dirname(require.resolve('sql.js'))
  const locateFile = (file: string) => path.join(sqlJsPath, file)
  const SQL = await initSqlJs({ locateFile })

  // Load existing DB file if present
  let sqlDb: any
  try {
    if (fs.existsSync(dbPath) && fs.statSync(dbPath).isFile()) {
      const buf = fs.readFileSync(dbPath)
      const u8 = new Uint8Array(buf)
      sqlDb = new SQL.Database(u8)
    } else {
      sqlDb = new SQL.Database()
    }
  } catch {
    sqlDb = new SQL.Database()
  }

  // Build a better-sqlite3-compatible prepared-statement adapter on top of sql.js.
  // sql.js PreparedStatement API: bind(), step(), getAsObject(), reset(), free(), run().
  // We expose: .run(...args), .get(...args), .all(...args) — same signatures as better-sqlite3.
  function wrapStatement(sql: string) {
    return {
      run: (...args: any[]) => {
        const stmt = sqlDb.prepare(sql)
        const params = args.flat()
        try {
          stmt.run(params.length ? params : [])
        } finally {
          stmt.free()
        }
        return { changes: 1 } // sql.js doesn't expose changes; assume 1 for compatibility
      },
      get: (...args: any[]) => {
        const stmt = sqlDb.prepare(sql)
        const params = args.flat()
        try {
          if (params.length) stmt.bind(params)
          const hasRow = stmt.step()
          if (!hasRow) return undefined
          return stmt.getAsObject()
        } finally {
          stmt.free()
        }
      },
      all: (...args: any[]) => {
        const stmt = sqlDb.prepare(sql)
        const params = args.flat()
        const rows: any[] = []
        try {
          if (params.length) stmt.bind(params)
          while (stmt.step()) {
            rows.push(stmt.getAsObject())
          }
        } finally {
          stmt.free()
        }
        return rows
      },
    }
  }

  const wrapper: any = {
    exec: (sql: string) => sqlDb.exec(sql),
    prepare: (sql: string) => wrapStatement(sql),
    run: (sql: string) => sqlDb.run(sql),
    export: () => sqlDb.export(),
    close: () => {
      const data = sqlDb.export()
      fs.writeFileSync(dbPath, Buffer.from(data))
      sqlDb.close()
    },
  }
  // mark wrapper so callers can detect sql.js mode
  wrapper.__isSqlJs = true

  _db = wrapper
  _isSqlJs = true
  return _db
}

export function getDb(): DB {
  if (!_db)
    throw new Error(
      'Database not initialized. Call initDatabase(path) or await initSqlJsDatabase(path) first.'
    )
  return _db
}

export function closeDatabase(): void {
  if (!_db) return
  try {
    if (_isSqlJs) {
      // @ts-ignore
      _db.close()
    } else {
      _db.close()
    }
  } finally {
    _db = null
    _isSqlJs = false
  }
}

export function runInTransaction<T>(fn: (db: DB) => T): T {
  const db = getDb()
  if (!_isSqlJs) {
    const tx = db.transaction((...args: any[]) => fn(db))
    return tx()
  }
  // sql.js doesn't support nested transactions in the same way; run function directly
  return fn(db)
}

/**
 * Run SQL migration files from a directory. Files are applied in lexical order.
 * A migrations table (schema_migrations) is used to track applied migrations.
 */
export function runMigrations(migrationsDir: string): void {
  const db = getDb()

  // Ensure migrations table
  try {
    if (!_isSqlJs) {
      db.exec(
        `CREATE TABLE IF NOT EXISTS schema_migrations (
          name TEXT PRIMARY KEY,
          applied_at TEXT NOT NULL
        );`
      )
    } else {
      db.exec(
        `CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);`
      )
    }
  } catch (err) {
    console.warn('runMigrations: failed creating schema_migrations', err)
  }

  if (!fs.existsSync(migrationsDir)) return

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    try {
      // Check applied
      let already = false
      if (!_isSqlJs) {
        const select = db.prepare('SELECT 1 FROM schema_migrations WHERE name = ? LIMIT 1')
        already = !!select.get(file)
      } else {
        const res = db.exec(`SELECT 1 FROM schema_migrations WHERE name = '${file}' LIMIT 1;`)
        already = Array.isArray(res) && res.length > 0 && res[0].values.length > 0
      }
      if (already) continue

      const full = path.join(migrationsDir, file)
      const sql = fs.readFileSync(full, 'utf8')

      if (!_isSqlJs) {
        // Apply migration directly (no explicit transaction wrapper to avoid nesting)
        db.exec(sql)
        const insert = db.prepare(
          "INSERT INTO schema_migrations(name, applied_at) VALUES (?, datetime('now'))"
        )
        insert.run(file)
      } else {
        db.exec(sql)
        db.exec(
          `INSERT INTO schema_migrations(name, applied_at) VALUES ('${file}', datetime('now'));`
        )
        // persist after each migration
        const data = db.export()
        fs.writeFileSync(path.resolve(process.cwd(), 'data', 'app.db'), Buffer.from(data))
      }
      console.info(`sqlite: applied migration ${file}`)
    } catch (err) {
      console.error(`sqlite: failed applying migration ${file}`, err)
      throw err
    }
  }
}
