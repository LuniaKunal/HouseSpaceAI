import { readFileSync } from 'node:fs';

export function databaseOptions(connectionString) {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL must be the PostgreSQL connection URI from Supabase Connect, not the project website URL.');
  if (!url.password && !process.env.DATABASE_PASSWORD) throw new Error('Set DATABASE_PASSWORD in .env.local to your Supabase database password.');
  // pg parses connectionString after individual options, which can overwrite a
  // separate password with the URI's empty password. Populate the URI itself.
  if (process.env.DATABASE_PASSWORD) url.password = encodeURIComponent(process.env.DATABASE_PASSWORD);
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  return { connectionString: url.toString(), ...(!['localhost', '127.0.0.1', '::1'].includes(url.hostname) ? { ssl: { rejectUnauthorized: true, ca: readFileSync(process.env.DATABASE_CA_FILE || new URL('./certs/supabase-ca.crt', import.meta.url), 'utf8') } } : {}) };
}
