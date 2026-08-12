import crypto from 'crypto';

export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_LOCK_MS = 15 * 60 * 1000;
export const MAX_ACCOUNT_ATTEMPTS = 5;
export const MAX_IP_ATTEMPTS = 25;
export const API_RATE_LIMIT_WINDOW_MS = 60 * 1000;

const DEFAULT_API_LIMITS = Object.freeze({ user: 120, ip: 300 });
const ACTION_API_LIMITS = Object.freeze({
  read_all: { user: 10, ip: 30 },
  read_dashboard: { user: 30, ip: 90 },
  delete_batch: { user: 10, ip: 30 },
  save_app_settings: { user: 20, ip: 60 },
});

export function hashSessionToken(token) {
  return crypto.createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

function hashRateLimitKey(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

export function getClientIp(headers) {
  // Netlify overwrites this header with the address of the direct client.
  // Generic forwarding headers are intentionally ignored because clients can
  // spoof them when no explicitly trusted proxy is present.
  const trustedIp = headers.get('x-nf-client-connection-ip');
  return trustedIp ? trustedIp.trim().slice(0, 128) : 'unknown';
}

function getApiRateLimitBuckets(userIdentifier, ip, action) {
  const userHash = hashRateLimitKey(String(userIdentifier || 'unknown'));
  const ipHash = hashRateLimitKey(String(ip || 'unknown').trim().toLowerCase());
  const actionLimits = ACTION_API_LIMITS[action];
  const buckets = [
    { key: `api:global:user:${userHash}`, limit: DEFAULT_API_LIMITS.user },
    { key: `api:global:ip:${ipHash}`, limit: DEFAULT_API_LIMITS.ip },
  ];
  if (actionLimits) {
    buckets.push(
      { key: `api:${action}:user:${userHash}`, limit: actionLimits.user },
      { key: `api:${action}:ip:${ipHash}`, limit: actionLimits.ip },
    );
  }
  return buckets;
}

export async function consumeApiRateLimit(db, userIdentifier, ip, action, now = Date.now()) {
  const cutoff = now - API_RATE_LIMIT_WINDOW_MS;
  let retryAfterSeconds = 0;
  const buckets = getApiRateLimitBuckets(userIdentifier, ip, action);
  const statements = buckets.map(({ key }) => ({
      sql: `INSERT INTO api_rate_limits (key, requestCount, windowStartedAt, updatedAt)
            VALUES (?, 1, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
              requestCount = CASE WHEN windowStartedAt <= ? THEN 1 ELSE requestCount + 1 END,
              windowStartedAt = CASE WHEN windowStartedAt <= ? THEN excluded.windowStartedAt ELSE windowStartedAt END,
              updatedAt = excluded.updatedAt
            RETURNING requestCount, windowStartedAt`,
      args: [key, now, now, cutoff, cutoff],
  }));
  const responses = typeof db.batch === 'function'
    ? await db.batch(statements)
    : await Promise.all(statements.map((statement) => db.execute(statement)));

  for (let index = 0; index < buckets.length; index += 1) {
    const { limit } = buckets[index];
    const response = responses[index];
    const row = response.rows[0];
    if (Number(row?.requestCount) > limit) {
      retryAfterSeconds = Math.max(
        retryAfterSeconds,
        Math.max(1, Math.ceil((Number(row.windowStartedAt) + API_RATE_LIMIT_WINDOW_MS - now) / 1000)),
      );
    }
  }

  return { limited: retryAfterSeconds > 0, retryAfterSeconds };
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
