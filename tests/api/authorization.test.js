import { describe, expect, it } from 'vitest';
import {
  getAllowedRoles,
  getExpectedRequestOrigin,
  getRequestServingOrigin,
  getVisibleAuditRows,
  isTrustedRequestOrigin,
  isRoleAllowed,
  ROLES,
} from '../../src/app/api/sheets/authorization';
import { validateAuth } from '../../src/app/api/sheets/sessions';
import {
  getExpiredSessionCookieOptions,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from '../../src/app/api/sheets/session-cookie';
import { hashSessionToken, publicErrorResponse } from '../../src/app/api/sheets/security';

describe('API authorization policy', () => {
  it('allows every authenticated role to read dashboard data and end its session', () => {
    for (const action of ['read_dashboard', 'logout']) {
      expect(getAllowedRoles(action)).toEqual([
        ROLES.ADMIN,
        ROLES.CREATOR,
        ROLES.VIEWER,
      ]);
    }
    expect(getAllowedRoles('list_sessions')).toEqual([ROLES.ADMIN]);
    expect(getAllowedRoles('revoke_session')).toEqual([ROLES.ADMIN]);
  });

  it('restricts full workspace reads to admins and creators', () => {
    expect(getAllowedRoles('read_all')).toEqual([ROLES.ADMIN, ROLES.CREATOR]);
    expect(isRoleAllowed('read_all', ROLES.VIEWER)).toBe(false);
  });

  it('allows creators to manage content workflows', () => {
    for (const action of ['save_script', 'save_schedule', 'save_ga_summary', 'save_ga_item']) {
      expect(isRoleAllowed(action, ROLES.CREATOR)).toBe(true);
      expect(isRoleAllowed(action, ROLES.VIEWER)).toBe(false);
    }
  });

  it('reserves administrative mutations for admins', () => {
    for (const action of ['create', 'update', 'delete', 'save_member', 'delete_schedule', 'delete_script', 'save_meeting', 'delete_meeting', 'delete_ga_item']) {
      expect(getAllowedRoles(action)).toEqual([ROLES.ADMIN]);
      expect(isRoleAllowed(action, ROLES.ADMIN)).toBe(true);
      expect(isRoleAllowed(action, ROLES.CREATOR)).toBe(false);
    }
  });

  it('defaults unknown actions to admin-only access', () => {
    expect(getAllowedRoles('unknown_action')).toEqual([ROLES.ADMIN]);
  });

  it('rejects cross-origin cookie-authenticated requests', () => {
    expect(isTrustedRequestOrigin('https://dashboard.example.test', 'https://dashboard.example.test')).toBe(true);
    expect(isTrustedRequestOrigin(null, 'https://dashboard.example.test')).toBe(true);
    expect(isTrustedRequestOrigin('https://attacker.example', 'https://dashboard.example.test')).toBe(false);
    expect(isTrustedRequestOrigin('not-a-url', 'https://dashboard.example.test')).toBe(false);
  });

  it('uses the configured application origin instead of forged proxy headers', () => {
    expect(getExpectedRequestOrigin('https://internal.invalid', 'https://dashboard.example.test/path', 'production'))
      .toBe('https://dashboard.example.test');
    expect(isTrustedRequestOrigin('https://attacker.example', getExpectedRequestOrigin(
      'https://internal.invalid',
      'https://dashboard.example.test',
      'production',
    ))).toBe(false);
  });

  it('accepts the actual serving origin for LAN development', () => {
    const servingOrigin = getRequestServingOrigin(
      'http://localhost:3000',
      '10.24.2.32:3000',
      'http',
      'development',
    );
    const expectedOrigin = getExpectedRequestOrigin(
      servingOrigin,
      'http://localhost:3000',
      'development',
    );

    expect(expectedOrigin).toBe('http://10.24.2.32:3000');
    expect(isTrustedRequestOrigin('http://10.24.2.32:3000', expectedOrigin)).toBe(true);
    expect(isTrustedRequestOrigin('https://attacker.example', expectedOrigin)).toBe(false);
  });

  it('does not trust a Host override when resolving a production origin', () => {
    expect(getRequestServingOrigin(
      'https://dashboard.example.test',
      'attacker.example',
      'https',
      'production',
    )).toBe('https://dashboard.example.test');
  });

  it('only exposes audit records to administrators', () => {
    const rows = [{ id: 'audit-1', details: 'sensitive' }];
    expect(getVisibleAuditRows(ROLES.ADMIN, rows)).toBe(rows);
    expect(getVisibleAuditRows(ROLES.CREATOR, rows)).toEqual([]);
    expect(getVisibleAuditRows(ROLES.VIEWER, rows)).toEqual([]);
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
    expect(calls[0].args).toEqual([hashSessionToken(session.token)]);
    expect(calls[0].args).not.toContain(session.token);
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

  it('uses a server-only, strict session cookie', () => {
    const options = getSessionCookieOptions(Date.now() + 60_000);
    expect(SESSION_COOKIE_NAME).toBe('gat_session');
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
    });
    expect(options.maxAge).toBeGreaterThan(0);
  });

  it('expires the session cookie during logout', () => {
    expect(getExpiredSessionCookieOptions()).toMatchObject({
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });
  });

  it('does not expose internal exception details to API clients', () => {
    expect(publicErrorResponse()).toEqual({
      success: false,
      error: 'An internal server error occurred',
    });
  });
});
