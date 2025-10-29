// src/lib/server/db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let dbInstance: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!dbInstance) {
    const DATABASE_URL = process.env.DATABASE_URL;

    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable must be set');
    }

    const client = postgres(DATABASE_URL);
    dbInstance = drizzle(client, { schema });
  }

  return dbInstance;
}
