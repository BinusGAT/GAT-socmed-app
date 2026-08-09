import { createClient } from '@libsql/client';
import { afterEach, describe, expect, it } from 'vitest';
import {
  getLoginRateLimit,
  getLoginRateLimitKeys,
  hashSessionToken,
  MAX_ACCOUNT_ATTEMPTS,
  recordLoginFailure,
} from '../../src/app/api/sheets/security';

const clients = [];

async function createRateLimitDb() {
  const client = createClient({ url: ':memory:' });
  clients.push(client);
  await client.execute(`CREATE TABLE login_attempts (
    key TEXT PRIMARY KEY,
    attempts INTEGER NOT NULL,
    windowStartedAt INTEGER NOT NULL,
    lockUntil INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`);
  return client;
}

afterEach(() => {
  for (const client of clients.splice(0)) client.close();
});

describe('security controls', () => {
  it('hashes session tokens deterministically without retaining the token', () => {
    const token = 'a-secret-session-token';
    const hash = hashSessionToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(hashSessionToken(token));
    expect(hash).not.toContain(token);
  });

  it('keeps an account locked when the attacker rotates IP addresses', async () => {
    const db = await createRateLimitDb();
    const now = 1_800_000_000_000;
    const originalKeys = getLoginRateLimitKeys('target@example.test', '192.0.2.1');
    for (let attempt = 0; attempt < MAX_ACCOUNT_ATTEMPTS; attempt += 1) {
      await recordLoginFailure(db, originalKeys, now + attempt);
    }

    const rotatedKeys = getLoginRateLimitKeys('target@example.test', '198.51.100.8');
    const result = await getLoginRateLimit(db, rotatedKeys, now + MAX_ACCOUNT_ATTEMPTS);
    expect(rotatedKeys[0].key).toBe(originalKeys[0].key);
    expect(rotatedKeys[1].key).not.toBe(originalKeys[1].key);
    expect(result.locked).toBe(true);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });
});
