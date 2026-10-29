import { createClient } from '@libsql/client';
import crypto from 'crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { hashCredential, verifyCredential } from '../../utils/credentialHash';

const clients = [];

async function createTestDb() {
  const client = createClient({ url: ':memory:' });
  clients.push(client);
  await client.execute(`CREATE TABLE user_credentials (
    userId TEXT PRIMARY KEY,
    nimHash TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
  )`);
  return client;
}

afterEach(() => {
  for (const client of clients.splice(0)) client.close();
});

// Helper simulating the route's dynamic credential resolution
async function authenticateUserCredential(db, userRow, submittedNim, now) {
  let nimHash = '';
  if (userRow) {
    const res = await db.execute({
      sql: 'SELECT nimHash FROM user_credentials WHERE userId = ? LIMIT 1',
      args: [String(userRow.id)],
    });
    nimHash = String(res.rows[0]?.nimHash || '');
  }

  let validNim = false;
  if (userRow) {
    if (userRow.nim) {
      const upstreamNim = String(userRow.nim).trim();
      const matchesUpstream =
        upstreamNim.length === submittedNim.length &&
        crypto.timingSafeEqual(Buffer.from(upstreamNim), Buffer.from(submittedNim));

      if (matchesUpstream) {
        validNim = true;
        // Dynamically provision or refresh Argon2id hash in user_credentials
        if (!nimHash || !(await verifyCredential(nimHash, submittedNim))) {
          const newHash = await hashCredential(submittedNim);
          await db.execute({
            sql: `INSERT OR REPLACE INTO user_credentials (userId, nimHash, createdAt, updatedAt) VALUES (?, ?, ?, ?)`,
            args: [String(userRow.id), newHash, now, now],
          });
        }
      }
    } else if (nimHash) {
      // Fallback if upstream NIM is not available directly
      validNim = await verifyCredential(nimHash, submittedNim);
    }
  }

  return validNim;
}

describe('dynamic credential provisioning and rotation', () => {
  it('automatically provisions user_credentials on first login for newly created central auth users', async () => {
    const db = await createTestDb();
    const now = Date.now();
    const newUser = { id: 'mock_user_1', name: 'Mock Intern', email: 'mock_intern@example.test', nim: 'mock_nim_123' };

    // Initially no credentials in application DB
    const initialCheck = await db.execute({
      sql: 'SELECT * FROM user_credentials WHERE userId = ?',
      args: ['mock_user_1'],
    });
    expect(initialCheck.rows.length).toBe(0);

    // Attempt login with valid NIM
    const isValid = await authenticateUserCredential(db, newUser, 'mock_nim_123', now);
    expect(isValid).toBe(true);

    // After login, credentials table now contains the Argon2id hash
    const afterLoginCheck = await db.execute({
      sql: 'SELECT * FROM user_credentials WHERE userId = ?',
      args: ['mock_user_1'],
    });
    expect(afterLoginCheck.rows.length).toBe(1);
    expect(afterLoginCheck.rows[0].nimHash).toMatch(/^\$argon2id\$/);

    // Subsequent login verifies correctly
    const secondLogin = await authenticateUserCredential(db, newUser, 'mock_nim_123', now);
    expect(secondLogin).toBe(true);
  });

  it('rejects invalid credentials for unprovisioned users and does not create credentials', async () => {
    const db = await createTestDb();
    const now = Date.now();
    const newUser = { id: 'mock_user_2', name: 'Mock User 2', email: 'mock_user2@example.test', nim: 'mock_nim_456' };

    const isValid = await authenticateUserCredential(db, newUser, 'wrong-credential', now);
    expect(isValid).toBe(false);

    const check = await db.execute({
      sql: 'SELECT * FROM user_credentials WHERE userId = ?',
      args: ['mock_user_2'],
    });
    expect(check.rows.length).toBe(0);
  });

  it('rotates credential hash when upstream central auth NIM is updated', async () => {
    const db = await createTestDb();
    const now = Date.now();
    const user = { id: 'mock_user_3', name: 'Mock User 3', email: 'mock_user3@example.test', nim: 'old_mock_nim' };

    // Initial provision
    await authenticateUserCredential(db, user, 'old_mock_nim', now);
    const initialCred = await db.execute({
      sql: 'SELECT nimHash FROM user_credentials WHERE userId = ?',
      args: ['mock_user_3'],
    });
    const oldHash = initialCred.rows[0].nimHash;

    // Upstream NIM is rotated in central auth DB
    const updatedUser = { ...user, nim: 'new_mock_nim' };

    // Old NIM fails immediately because upstream changed
    const oldAttempt = await authenticateUserCredential(db, updatedUser, 'old_mock_nim', now);
    expect(oldAttempt).toBe(false);

    // New NIM succeeds and updates stored hash
    const newAttempt = await authenticateUserCredential(db, updatedUser, 'new_mock_nim', now);
    expect(newAttempt).toBe(true);

    const updatedCred = await db.execute({
      sql: 'SELECT nimHash FROM user_credentials WHERE userId = ?',
      args: ['mock_user_3'],
    });
    expect(updatedCred.rows[0].nimHash).not.toBe(oldHash);
    expect(updatedCred.rows[0].nimHash).toMatch(/^\$argon2id\$/);
  });
});
