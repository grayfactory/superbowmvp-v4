// src/lib/server/db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '$env/static/private';
import * as schema from './schema';

// Extract database connection string from Supabase URL
// Supabase URL format: https://xxxxx.supabase.co
// Connection string format: postgres://postgres:[password]@db.xxxxx.supabase.co:5432/postgres
const projectId = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
const connectionString = `postgres://postgres:${SUPABASE_SERVICE_KEY}@db.${projectId}.supabase.co:5432/postgres`;

// Create postgres client
const client = postgres(connectionString);

// Create drizzle instance
export const db = drizzle(client, { schema });
