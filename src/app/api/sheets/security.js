import crypto from 'crypto';

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;
export const MAX_ACCOUNT_ATTEMPTS = 5;
export const MAX_IP_ATTEMPTS = 25;

export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

function hashRateLimitKey(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

export function getClientIp(headers) {
  const trustedIp = headers.get('x-nf-client-connection-ip')
    || headers.get('cf-connecting-ip')
    || headers.get('x-real-ip');
  if (trustedIp) return trustedIp.trim().slice(0, 128);
  return (headers.get('x-forwarded-for')?.split(',')[0] || 'unknown').trim().slice(0, 128);
}

export function getLoginRateLimitKeys(email, ip) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedIp = String(ip || 'unknown').trim().toLowerCase();
  return [
    { key: `account:${hashRateLimitKey(normalizedEmail)}`, limit: MAX_ACCOUNT_ATTEMPTS },
    { key: `ip:${hashRateLimitKey(normalizedIp)}`, limit: MAX_IP_ATTEMPTS },
  ];
}

export async function getLoginRateLimit(db, keys, now = Date.now()) {
  const placeholders = keys.map(() => '?').join(', ');
  const response = await db.execute({
    sql: `SELECT key, attempts, lockUntil FROM login_attempts WHERE key IN (${placeholders})`,
    args: keys.map(({ key }) => key),
  });
  const locked = response.rows.find((row) => Number(row.lockUntil) > now);
  return {
    locked: Boolean(locked),
    retryAfterSeconds: locked ? Math.max(1, Math.ceil((Number(locked.lockUntil) - now) / 1000)) : 0,
  };
}

export async function recordLoginFailure(db, keys, now = Date.now()) {
  const cutoff = now - LOGIN_WINDOW_MS;
  const lockUntil = now + LOGIN_LOCK_MS;
  for (const { key, limit } of keys) {
    await db.execute({
      sql: `INSERT INTO login_attempts (key, attempts, windowStartedAt, lockUntil, updatedAt)
            VALUES (?, 1, ?, 0, ?)
            ON CONFLICT(key) DO UPDATE SET
              attempts = CASE WHEN windowStartedAt < ? THEN 1 ELSE attempts + 1 END,
              windowStartedAt = CASE WHEN windowStartedAt < ? THEN ? ELSE windowStartedAt END,
              lockUntil = CASE
                WHEN (CASE WHEN windowStartedAt < ? THEN 1 ELSE attempts + 1 END) >= ? THEN ?
                ELSE lockUntil
              END,
              updatedAt = ?`,
      args: [key, now, now, cutoff, cutoff, now, cutoff, limit, lockUntil, now],
    });
  }
  return getLoginRateLimit(db, keys, now);
}

export async function clearAccountLoginFailures(db, accountKey) {
  await db.execute({ sql: 'DELETE FROM login_attempts WHERE key = ?', args: [accountKey] });
}

export function publicErrorResponse() {
  return { success: false, error: 'An internal server error occurred' };
}
