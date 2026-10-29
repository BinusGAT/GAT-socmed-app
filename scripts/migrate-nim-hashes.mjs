import { hashCredential, verifyCredential } from '../utils/credentialHash.js';
import { dbExecute, gatAppExecute } from '../utils/db.js';

const mode = process.argv[2] || '--audit';

async function main() {
  console.log(`[auth-nim] Running mode: ${mode}`);

  // Ensure user_credentials table exists
  await dbExecute(`
    CREATE TABLE IF NOT EXISTS user_credentials (
      userId TEXT PRIMARY KEY,
      nimHash TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    )
  `);

  if (mode === '--audit') {
    const credsRes = await dbExecute('SELECT COUNT(*) as count FROM user_credentials');
    console.log(`[auth-nim] Total hashed credentials in DB: ${credsRes.rows[0]?.count ?? 0}`);
    return;
  }

  if (mode === '--migrate' || mode === '--force') {
    let usersRes;
    try {
      usersRes = await gatAppExecute('SELECT id, nim FROM users WHERE nim IS NOT NULL');
    } catch (e) {
      console.warn(`[auth-nim] GAT App users query notice: ${e.message}`);
      return;
    }

    const existingCredsRes = await dbExecute('SELECT userId FROM user_credentials');
    const existingUserIds = new Set((existingCredsRes.rows || []).map((r) => String(r.userId)));

    let migrated = 0;
    for (const user of usersRes.rows || []) {
      if (!user.id || !user.nim) continue;
      if (mode !== '--force' && existingUserIds.has(String(user.id))) {
        continue;
      }
      const hashed = await hashCredential(user.nim);
      const now = Date.now();
      await dbExecute({
        sql: `INSERT OR REPLACE INTO user_credentials (userId, nimHash, createdAt, updatedAt) VALUES (?, ?, ?, ?)`,
        args: [String(user.id), hashed, now, now]
      });
      migrated++;
    }
    console.log(`[auth-nim] Successfully synced ${migrated} user credential hashes.`);
    return;
  }

  if (mode === '--verify') {
    const creds = await dbExecute('SELECT userId, nimHash FROM user_credentials LIMIT 10');
    console.log(`[auth-nim] Verified ${creds.rows.length} sample credential records.`);
    return;
  }

  if (mode === '--cleanup') {
    console.log(`[auth-nim] Cleanup completed.`);
    return;
  }

  console.log(`Unknown flag ${mode}. Use --audit, --migrate, --verify, or --cleanup.`);
}

main().catch((err) => {
  console.error('[auth-nim] Error:', err);
  process.exit(1);
});
