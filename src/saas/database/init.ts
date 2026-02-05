import { promises as fs } from 'fs';
import path from 'path';
import { createDatabaseAdapter, DatabaseAdapter } from '../../database/database-adapter';
import { logger } from '../../utils/logger';

let usersDb: DatabaseAdapter | null = null;

/**
 * Initialize the users database for SaaS functionality
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

  // Run migrations
  await runMigrations(usersDb);

  logger.info('Users database initialized successfully');
  return usersDb;
}

/**
 * Get the users database instance
 */
export function getUsersDatabase(): DatabaseAdapter {
  if (!usersDb) {
    throw new Error('Users database not initialized. Call initUsersDatabase() first.');
  }
  return usersDb;
}

/**
 * Run database migrations
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
    logger.info('Users database closed');
  }
}
