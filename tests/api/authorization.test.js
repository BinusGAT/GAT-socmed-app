import { describe, expect, it } from 'vitest';
import {
  getAllowedRoles,
  isRoleAllowed,
  ROLES,
} from '../../src/app/api/sheets/authorization';
import { validateAuth } from '../../src/app/api/sheets/sessions';

describe('API authorization policy', () => {
  it('allows every authenticated role to read and manage its own sessions', () => {
    for (const action of ['read_all', 'list_sessions', 'revoke_session', 'logout']) {
      expect(getAllowedRoles(action)).toEqual([
        ROLES.ADMIN,
        ROLES.CREATOR,
        ROLES.VIEWER,
      ]);
    }
  });

  it('allows creators to manage content workflows', () => {
    for (const action of ['save_script', 'save_schedule', 'save_meeting']) {
      expect(isRoleAllowed(action, ROLES.CREATOR)).toBe(true);
      expect(isRoleAllowed(action, ROLES.VIEWER)).toBe(false);
    }
  });

  it('reserves administrative mutations for admins', () => {
    for (const action of ['create', 'update', 'delete', 'save_member']) {
      expect(getAllowedRoles(action)).toEqual([ROLES.ADMIN]);
      expect(isRoleAllowed(action, ROLES.ADMIN)).toBe(true);
      expect(isRoleAllowed(action, ROLES.CREATOR)).toBe(false);
    }
  });

  it('defaults unknown actions to admin-only access', () => {
    expect(getAllowedRoles('unknown_action')).toEqual([ROLES.ADMIN]);
  });

  it('accepts a valid server-side session and refreshes last-seen time', async () => {
    const session = {
      token: 'server-token',
      role: ROLES.CREATOR,
      expiresAt: Date.now() + 60_000,
      userId: 'user-1',
      userName: 'Creator',
      userEmail: 'creator@example.test',
      sessionId: 'session-1',
    };
    const calls = [];
    const db = {
      execute: async (query) => {
        calls.push(query);
        return calls.length === 1 ? { rows: [session] } : { rows: [] };
      },
    };

    const result = await validateAuth(db, session.token, [ROLES.ADMIN, ROLES.CREATOR]);

    expect(result).toMatchObject({ valid: true, role: ROLES.CREATOR, userId: 'user-1' });
    expect(calls).toHaveLength(2);
    expect(calls[1].sql).toContain('UPDATE sessions SET lastSeenAt');
  });

  it('deletes and rejects an expired session', async () => {
    const calls = [];
    const db = {
      execute: async (query) => {
        calls.push(query);
        return calls.length === 1
          ? { rows: [{ token: 'expired', role: ROLES.ADMIN, expiresAt: Date.now() - 1 }] }
          : { rows: [] };
      },
    };

    await expect(validateAuth(db, 'expired', [ROLES.ADMIN])).resolves.toEqual({ valid: false, role: null });
    expect(calls[1].sql).toContain('DELETE FROM sessions');
  });

  it('rejects a valid session when its role cannot perform the action', async () => {
    const db = {
      execute: async () => ({
        rows: [{ token: 'viewer', role: ROLES.VIEWER, expiresAt: Date.now() + 60_000 }],
      }),
    };

    await expect(validateAuth(db, 'viewer', [ROLES.ADMIN])).resolves.toEqual({ valid: false, role: null });
  });
});
