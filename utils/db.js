import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.warn('⚠️ TURSO_DATABASE_URL is not defined. Falling back to local file-based database for development.');
}

export const db = createClient({
  url: url || 'file:local.db',
  authToken: authToken || '',
});
