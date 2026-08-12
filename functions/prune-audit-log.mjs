import { createClient } from '@libsql/client';

const AUDIT_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

async function pruneAuditLog() {
  const url = String(process.env.APP_DATABASE_URL || '').replace(/^:/, '');
  const authToken = process.env.APP_DATABASE_AUTH_TOKEN || '';
  if (!url) throw new Error('APP_DATABASE_URL is required for audit retention.');

  const client = createClient({ url, authToken });
  try {
    const result = await client.execute({
      sql: 'DELETE FROM audit_log WHERE createdAt < ?',
      args: [Date.now() - AUDIT_RETENTION_MS],
    });
    console.log(`Audit retention completed; removed ${Number(result.rowsAffected || 0)} row(s).`);
  } finally {
    client.close();
  }
}

export default pruneAuditLog;
