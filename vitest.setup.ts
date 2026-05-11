import { beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { initSqlJsDatabase, closeDatabase, runMigrations } from './src/db/sqlite';

// Provide a Jest-compatible alias for legacy tests.
(globalThis as any).jest = vi;

vi.mock('axios', () => {
  const mock = {
    post: vi.fn(),
    get: vi.fn(),
    default: undefined as any,
  };
  mock.default = mock;
  return mock;
});

let tempDbPath = path.resolve(process.cwd(), 'data', 'test.db');

beforeEach(async () => {
  try { fs.unlinkSync(tempDbPath); } catch { /* file may not exist in non-DB tests */ }
  await initSqlJsDatabase(tempDbPath);
  runMigrations(path.resolve(process.cwd(), 'migrations'));
});

afterEach(() => {
  try { closeDatabase(); } catch (e) {}
  try { fs.unlinkSync(tempDbPath); } catch { /* file may not exist in non-DB tests */ }
});

