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

export async function dbExecute(queryObj, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await db.execute(queryObj);
    } catch (err) {
      const errMsg = String(err.message || '').toLowerCase();
      const isLocked = errMsg.includes('lock') || errMsg.includes('busy') || errMsg.includes('timeout');
      if (isLocked && attempt < maxAttempts) {
        // Wait between 100ms and 250ms with jitter
        const delay = 100 + Math.floor(Math.random() * 150);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}

export async function dbBatch(queries, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await db.batch(queries);
    } catch (err) {
      const errMsg = String(err.message || '').toLowerCase();
      const isLocked = errMsg.includes('lock') || errMsg.includes('busy') || errMsg.includes('timeout');
      if (isLocked && attempt < maxAttempts) {
        const delay = 100 + Math.floor(Math.random() * 150);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}
