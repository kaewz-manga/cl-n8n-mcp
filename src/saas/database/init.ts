import { promises as fs } from 'fs';
import path from 'path';
import { createDatabaseAdapter, DatabaseAdapter } from '../../database/database-adapter';
import { logger } from '../../utils/logger';
import { D1Adapter, SyncToAsyncAdapter, AsyncDatabase } from './d1-adapter';
import { setDatabaseGetter } from './users-repository';

let usersDb: DatabaseAdapter | null = null;
let asyncDb: AsyncDatabase | null = null;

/**
 * Initialize users database with Cloudflare D1 (Workers mode)
 */
export function initD1Database(d1: D1Database): AsyncDatabase {
  const adapter = new D1Adapter(d1);
  asyncDb = adapter;
  setDatabaseGetter(() => adapter);
  return adapter;
}

/**
 * Run migrations on D1 database
 */
export async function runD1Migrations(d1: D1Database, migrationSql: string): Promise<void> {
  await d1.exec(migrationSql);
  logger.info('D1 database migrations completed');
}

/**
 * Initialize the users database for SaaS functionality (Express/Docker mode)
 */
export async function initUsersDatabase(): Promise<DatabaseAdapter> {
  if (usersDb) {
    return usersDb;
  }

  const dbPath = path.join(process.cwd(), 'data', 'users.db');

  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  // Create database adapter
  usersDb = await createDatabaseAdapter(dbPath);

  // Wrap sync adapter as async for repository compatibility
  const wrapper = new SyncToAsyncAdapter(usersDb);
  asyncDb = wrapper;
  setDatabaseGetter(() => wrapper);

  // Run migrations
  await runMigrations(usersDb);

  logger.info('Users database initialized successfully');
  return usersDb;
}

/**
 * Get the users database instance (legacy sync)
 */
export function getUsersDatabase(): DatabaseAdapter {
  if (!usersDb) {
    throw new Error('Users database not initialized. Call initUsersDatabase() first.');
  }
  return usersDb;
}

/**
 * Get the async database instance
 */
export function getAsyncDatabase(): AsyncDatabase {
  if (!asyncDb) {
    throw new Error('Database not initialized. Call initUsersDatabase() or initD1Database() first.');
  }
  return asyncDb;
}

/**
 * Run database migrations (Express/Docker mode)
 */
async function runMigrations(db: DatabaseAdapter): Promise<void> {
  const migrationsPath = path.join(process.cwd(), 'migrations', '001_initial.sql');

  try {
    const sql = await fs.readFile(migrationsPath, 'utf-8');

    // Remove comments and normalize whitespace
    const cleanedSql = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    // Split by semicolons followed by newline (to handle multi-line statements)
    const statements = cleanedSql
      .split(/;\s*\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        // Add semicolon back if not present
        const finalStatement = statement.endsWith(';') ? statement : statement + ';';
        db.exec(finalStatement);
        successCount++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Ignore "table already exists" errors
        if (errorMessage.includes('already exists')) {
          skipCount++;
        } else {
          errorCount++;
          logger.warn(`Migration statement failed: ${statement.substring(0, 60)}...`, error);
        }
      }
    }

    logger.info(`Database migrations completed: ${successCount} success, ${skipCount} skipped, ${errorCount} errors`);
  } catch (error) {
    logger.error('Failed to run migrations', error);
    throw error;
  }
}

/**
 * Close the users database
 */
export function closeUsersDatabase(): void {
  if (usersDb) {
    usersDb.close();
    usersDb = null;
    asyncDb = null;
    logger.info('Users database closed');
  }
}
