import crypto from 'crypto';
import { hashSessionToken } from './security';

export async function validateAuth(db, token, allowedRoles) {
  if (!token || typeof token !== 'string') return { valid: false, role: null };

  try {
    const response = await db.execute({
      sql: 'SELECT * FROM sessions WHERE token = ? LIMIT 1',
      args: [hashSessionToken(token)],
    });
    const session = response.rows[0];
    if (!session) return { valid: false, role: null };

    if (session.expiresAt < Date.now()) {
      await db.execute({ sql: 'DELETE FROM sessions WHERE token = ?', args: [hashSessionToken(token)] });
      return { valid: false, role: null };
    }

    if (!allowedRoles.includes(session.role)) return { valid: false, role: null };

    await db.execute({
      sql: 'UPDATE sessions SET lastSeenAt = ? WHERE token = ?',
      args: [Date.now(), hashSessionToken(token)],
    });
    return {
      valid: true,
      role: session.role,
      userId: session.userId,
      userName: session.userName,
      userEmail: session.userEmail,
      sessionId: session.sessionId,
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false, role: null };
  }
}

export async function writeAudit(db, auth, action, entityType, entityId, details = {}) {
  await db.execute({
    sql: `INSERT INTO audit_log (id, userId, userName, role, action, entityType, entityId, details, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      crypto.randomUUID(),
      auth.userId ? String(auth.userId) : '',
      auth.userName || 'Unknown user',
      auth.role || '',
      action,
      entityType,
      String(entityId || ''),
      JSON.stringify(details),
      Date.now(),
    ],
  });
}
