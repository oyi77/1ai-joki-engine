#!/usr/bin/env ts-node
/* Seed script for development: creates one account, one template, and one scheduled job */
import * as fs from 'fs';
import path from 'path';
const dbModule = await import('../src/db/sqlite.js');
const AccountsRepo = (await import('../src/repos/accountsRepo.js')).AccountsRepo;
const TemplatesRepo = (await import('../src/repos/templatesRepo.js')).TemplatesRepo;
const JobsRepo = (await import('../src/repos/jobsRepo.js')).JobsRepo;

async function main(): Promise<void> {
  const DB_PATH = path.resolve(process.cwd(), 'data', 'app.db');
  // init (native or sql.js)
  try {
    dbModule.initDatabase(DB_PATH);
    console.log('Using native better-sqlite3');
  } catch (e: unknown) {
    console.log('Falling back to sql.js');
    await dbModule.initSqlJsDatabase(DB_PATH);
    console.log('Initialized sql.js DB');
  }

  // Ensure migrations applied before inserting seed data
  const MIGRATIONS_DIR = path.resolve(process.cwd(), 'migrations');
  dbModule.runMigrations(MIGRATIONS_DIR);

  const accounts = new AccountsRepo();
  const templates = new TemplatesRepo();
  const jobs = new JobsRepo();

  const acc = accounts.create({ platform: 'mock', display_name: 'dev-account', credentials_encrypted: 'mock' });
  console.log('Created account', acc.id);

  const tpl = templates.create({ name: 'Welcome', content: 'Hello {name}', variables: ['name'], type: 'template' });
  console.log('Created template', tpl.id);

  const job = jobs.create({ account_id: acc.id, platform: 'mock', type: 'post', payload: { template_id: tpl.id, message: 'Hello world' } });
  console.log('Created job', job.id);

  if (dbModule.closeDatabase) dbModule.closeDatabase();
}

main().catch((err: unknown) => {
  const errorMessage = err instanceof Error ? err.message : String(err);
  console.error(errorMessage);
  process.exit(1);
});
