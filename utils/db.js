// utils/db.js
// Dynamic database initializer to handle serverless deployments safely.

let clientInstance = null;

async function getDbClient() {
  if (clientInstance) return clientInstance;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (url && (url.startsWith('libsql:') || url.startsWith('https:'))) {
    // For remote Turso DB, import the web-only client (safe for serverless/Netlify functions)
    const { createClient } = await import('@libsql/client/web');
    clientInstance = createClient({
      url: url,
      authToken: authToken || '',
    });
  } else {
    // For local dev file DB, import the native client (uses native C++ SQLite bindings)
    const { createClient } = await import('@libsql/client');
    clientInstance = createClient({
      url: url || 'file:local.db',
      authToken: authToken || '',
    });
  }

  return clientInstance;
}

export async function dbExecute(queryObj, maxAttempts = 5) {
  const client = await getDbClient();
  const url = process.env.TURSO_DATABASE_URL || '';
  const isRemote = url.startsWith('libsql:') || url.startsWith('https:');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await client.execute(queryObj);
    } catch (err) {
      const errMsg = String(err.message || '').toLowerCase();
      const isLocked = errMsg.includes('lock') || errMsg.includes('busy') || errMsg.includes('timeout');
      
      // Retrying locked/busy database is only relevant for local SQLite files
      if (isLocked && !isRemote && attempt < maxAttempts) {
        const delay = 100 + Math.floor(Math.random() * 150);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}

export async function dbBatch(queries, maxAttempts = 5) {
  const client = await getDbClient();
  const url = process.env.TURSO_DATABASE_URL || '';
  const isRemote = url.startsWith('libsql:') || url.startsWith('https:');

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await client.batch(queries);
    } catch (err) {
      const errMsg = String(err.message || '').toLowerCase();
      const isLocked = errMsg.includes('lock') || errMsg.includes('busy') || errMsg.includes('timeout');
      
      if (isLocked && !isRemote && attempt < maxAttempts) {
        const delay = 100 + Math.floor(Math.random() * 150);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
}
