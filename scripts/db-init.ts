#!/usr/bin/env ts-node
import path from 'path';
import * as fs from 'fs';

// Initialize database using src/db/sqlite.ts which supports better-sqlite3 or sql.js fallback
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.resolve(ROOT, 'data');
const DB_PATH = path.resolve(DATA_DIR, 'app.db');
const MIGRATIONS_DIR = path.resolve(ROOT, 'migrations');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function main(): Promise<void> {
  ensureDir(DATA_DIR);
  // Import DB helper (TypeScript via ts-node)
  const dbModule = await import('../src/db/sqlite');

  let db: unknown;
  try {
    // Try native init first
    db = dbModule.initDatabase(DB_PATH);
    console.log('Initialized native better-sqlite3 database at', DB_PATH);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.warn('Native better-sqlite3 not available, falling back to sql.js:', errorMessage);
    db = await dbModule.initSqlJsDatabase(DB_PATH);
    console.log('Initialized sql.js database at', DB_PATH);
  }

  // Run migrations
  try {
    dbModule.runMigrations(MIGRATIONS_DIR);
  } catch (err) {
    console.error('Failed running migrations:', err);
    try {
      if (dbModule.closeDatabase) dbModule.closeDatabase();
    } catch {}
    throw err;
  }

  // Close DB (sql.js persists to file in close)
  try {
    if (dbModule.closeDatabase) dbModule.closeDatabase();
  } catch {}

  console.log('DB initialization complete.');
}

main().catch((err: unknown) => {
  const errorMessage = err instanceof Error ? err.message : String(err);
  console.error('DB init failed:', errorMessage);
  process.exit(1);
});
