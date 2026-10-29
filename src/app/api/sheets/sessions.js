import crypto from 'crypto';
import { hashSessionToken } from './security';
import { getGatAppDbClient } from '../../../../utils/db';

const REVALIDATION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export async function validateAuth(db, token, allowedRoles = []) {
  if (!token || typeof token !== 'string') return { valid: false, authenticated: false, role: null, reason: 'unauthenticated' };

  try {
    const hashedToken = hashSessionToken(token);
    const response = await db.execute({
      sql: 'SELECT * FROM sessions WHERE token = ? LIMIT 1',
      args: [hashedToken],
    });
    const session = response.rows[0];
    if (!session) return { valid: false, authenticated: false, role: null, reason: 'invalid_token' };

    const now = Date.now();
    if (session.expiresAt < now) {
      await db.execute({ sql: 'DELETE FROM sessions WHERE token = ?', args: [hashedToken] });
      return { valid: false, authenticated: false, role: null, reason: 'expired_token' };
    }

    let activeRole = session.role;

    // Periodic role re-validation against authoritative GAT App database
    const lastValidated = Number(session.lastValidatedAt || session.createdAt || now);
    if (now - lastValidated > REVALIDATION_INTERVAL_MS && session.userId) {
      try {
        const gatAppDb = getGatAppDbClient();
        const userRes = await gatAppDb.execute({
          sql: `
            SELECT GROUP_CONCAT(r.name) AS role_names
            FROM users u
            LEFT JOIN user_roles ur ON ur.user_id = u.id
            LEFT JOIN roles r ON r.id = ur.role_id
            WHERE u.id = ?
            GROUP BY u.id
            LIMIT 1
          `,
          args: [session.userId]
        });

        const userRow = userRes.rows[0];
        if (!userRow) {
          // User was removed from upstream database: revoke session
          await db.execute({ sql: 'DELETE FROM sessions WHERE token = ?', args: [hashedToken] });
          return { valid: false, authenticated: false, role: null, reason: 'revoked' };
        }

        const roleNames = String(userRow.role_names || '')
          .split(',')
          .map((r) => r.trim().toLowerCase())
          .filter(Boolean);

        const hasAdminRole = roleNames.includes('admin');
        const hasInternRole = roleNames.includes('intern');

        if (!hasAdminRole && !hasInternRole) {
          await db.execute({ sql: 'DELETE FROM sessions WHERE token = ?', args: [hashedToken] });
          return { valid: false, authenticated: false, role: null, reason: 'revoked' };
        }

        const freshRole = hasAdminRole ? 'Admin' : 'Creator';
        if (freshRole !== session.role) {
          activeRole = freshRole;
          await db.execute({
            sql: 'UPDATE sessions SET role = ?, lastValidatedAt = ?, lastSeenAt = ? WHERE token = ?',
            args: [freshRole, now, now, hashedToken]
          });
        } else {
          await db.execute({
            sql: 'UPDATE sessions SET lastValidatedAt = ?, lastSeenAt = ? WHERE token = ?',
            args: [now, now, hashedToken]
          });
        }
      } catch (err) {
        // Fallback gracefully on upstream connection timeout without dropping valid local sessions
        console.warn('[Session] Upstream re-validation query skipped:', err.message);
      }
    } else {
      await db.execute({
        sql: 'UPDATE sessions SET lastSeenAt = ? WHERE token = ?',
        args: [now, hashedToken],
      });
    }

    const roleAllowed = allowedRoles.length === 0 || allowedRoles.includes(activeRole);
    if (!roleAllowed) {
      return {
        valid: false,
        authenticated: true,
        role: activeRole,
        userId: session.userId,
        userName: session.userName,
        userEmail: session.userEmail,
        sessionId: session.sessionId,
        reason: 'forbidden'
      };
    }

    return {
      valid: true,
      authenticated: true,
      role: activeRole,
      userId: session.userId,
      userName: session.userName,
      userEmail: session.userEmail,
      sessionId: session.sessionId,
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false, authenticated: false, role: null, reason: 'error' };
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
