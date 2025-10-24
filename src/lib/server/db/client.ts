// src/lib/server/db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Get DATABASE_URL from process.env (works with Vercel dev)
const DATABASE_URL = process.env.DATABASE_URL;

// Validate environment variable
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable must be set');
}

// Create postgres client
const client = postgres(DATABASE_URL);

// Create drizzle instance
export const db = drizzle(client, { schema });
