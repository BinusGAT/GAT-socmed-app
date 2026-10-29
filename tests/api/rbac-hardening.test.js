import { describe, expect, it, vi } from 'vitest';
import { getAllowedRoles, isRoleAllowed, ROLES } from '../../src/app/api/sheets/authorization';
import { validateAuth } from '../../src/app/api/sheets/sessions';
import { canAccessView } from '../../utils/rolePermissions';

describe('RBAC Hardening & Role Authorization Matrix', () => {
  describe('getAllowedRoles & isRoleAllowed matrix', () => {
    it('restricts administrative mutations to Admin role only', () => {
      const adminOnlyActions = [
        'create',
        'update',
        'delete',
        'delete_batch',
        'delete_schedule',
        'save_app_setting',
        'save_app_settings',
        'save_platform',
        'delete_platform',
        'save_category',
        'delete_category',
        'save_member',
        'delete_member',
        'save_meeting',
        'delete_meeting',
        'save_notification',
        'delete_notification',
        'revoke_session',
      ];

      for (const action of adminOnlyActions) {
        expect(getAllowedRoles(action)).toEqual([ROLES.ADMIN]);
        expect(isRoleAllowed(action, ROLES.ADMIN)).toBe(true);
        expect(isRoleAllowed(action, ROLES.CREATOR)).toBe(false);
        expect(isRoleAllowed(action, ROLES.VIEWER)).toBe(false);
      }
    });

    it('allows Creator and Admin for scoped workflow actions', () => {
      const creatorActions = [
        'save_script',
        'save_schedule',
        'save_ga_summary',
        'save_ga_item',
      ];

      for (const action of creatorActions) {
        const allowed = getAllowedRoles(action);
        expect(allowed).toContain(ROLES.ADMIN);
        expect(allowed).toContain(ROLES.CREATOR);
        expect(allowed).not.toContain(ROLES.VIEWER);
        expect(isRoleAllowed(action, ROLES.ADMIN)).toBe(true);
        expect(isRoleAllowed(action, ROLES.CREATOR)).toBe(true);
        expect(isRoleAllowed(action, ROLES.VIEWER)).toBe(false);
      }
    });

    it('allows Viewer, Creator, and Admin for overview read actions', () => {
      const generalActions = ['read_dashboard', 'logout'];

      for (const action of generalActions) {
        const allowed = getAllowedRoles(action);
        expect(allowed).toEqual([ROLES.ADMIN, ROLES.CREATOR, ROLES.VIEWER]);
        expect(isRoleAllowed(action, ROLES.ADMIN)).toBe(true);
        expect(isRoleAllowed(action, ROLES.CREATOR)).toBe(true);
        expect(isRoleAllowed(action, ROLES.VIEWER)).toBe(true);
      }
    });
  });

  describe('validateAuth security responses', () => {
    it('returns unauthenticated for missing or empty token', async () => {
      const mockDb = { execute: vi.fn() };
      const res = await validateAuth(mockDb, '', [ROLES.ADMIN]);
      expect(res.valid).toBe(false);
      expect(res.authenticated).toBe(false);
      expect(res.reason).toBe('unauthenticated');
    });

    it('returns invalid_token when session is not found in database', async () => {
      const mockDb = {
        execute: vi.fn().mockResolvedValue({ rows: [] }),
      };
      const res = await validateAuth(mockDb, 'random-token-123456789012345678901234', [ROLES.ADMIN]);
      expect(res.valid).toBe(false);
      expect(res.authenticated).toBe(false);
      expect(res.reason).toBe('invalid_token');
    });

    it('returns expired_token and cleans up session when token is expired', async () => {
      const mockDb = {
        execute: vi.fn()
          .mockResolvedValueOnce({
            rows: [{
              token: 'hashed',
              role: 'Admin',
              expiresAt: Date.now() - 10000,
            }],
          })
          .mockResolvedValueOnce({ rows: [] }),
      };
      const res = await validateAuth(mockDb, 'expired-token-12345678901234567890', [ROLES.ADMIN]);
      expect(res.valid).toBe(false);
      expect(res.authenticated).toBe(false);
      expect(res.reason).toBe('expired_token');
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({ sql: expect.stringContaining('DELETE FROM sessions') })
      );
    });

    it('returns forbidden with role info when authenticated user lacks role permission', async () => {
      const mockDb = {
        execute: vi.fn().mockResolvedValue({
          rows: [{
            token: 'hashed',
            role: 'Viewer',
            userId: 'usr_viewer',
            userName: 'Viewer Person',
            userEmail: 'viewer@example.com',
            sessionId: 'sess_1',
            expiresAt: Date.now() + 3600000,
          }],
        }),
      };
      const res = await validateAuth(mockDb, 'valid-viewer-token-123456789012345', [ROLES.ADMIN]);
      expect(res.valid).toBe(false);
      expect(res.authenticated).toBe(true);
      expect(res.role).toBe('Viewer');
      expect(res.reason).toBe('forbidden');
      expect(res.userId).toBe('usr_viewer');
    });

    it('returns valid when authenticated user has the required role', async () => {
      const mockDb = {
        execute: vi.fn()
          .mockResolvedValueOnce({
            rows: [{
              token: 'hashed',
              role: 'Admin',
              userId: 'usr_admin',
              userName: 'Admin Person',
              userEmail: 'admin@example.com',
              sessionId: 'sess_admin_1',
              expiresAt: Date.now() + 3600000,
            }],
          })
          .mockResolvedValueOnce({ rows: [] }),
      };
      const res = await validateAuth(mockDb, 'valid-admin-token-1234567890123456', [ROLES.ADMIN]);
      expect(res.valid).toBe(true);
      expect(res.authenticated).toBe(true);
      expect(res.role).toBe('Admin');
      expect(res.userId).toBe('usr_admin');
    });

    it('rejects access when session role is revoked or modified', async () => {
      const mockDb = {
        execute: vi.fn()
          .mockResolvedValueOnce({
            rows: [{
              token: 'hashed',
              role: 'Creator',
              userId: 'usr_demoted',
              userName: 'Demoted Person',
              userEmail: 'demoted@example.com',
              sessionId: 'sess_demoted_1',
              expiresAt: Date.now() + 3600000,
            }],
          }),
      };
      const res = await validateAuth(mockDb, 'valid-token-12345678901234567890', [ROLES.ADMIN]);
      expect(res.valid).toBe(false);
      expect(res.authenticated).toBe(true);
      expect(res.reason).toBe('forbidden');
    });
  });

  describe('Client View Permissions Matrix', () => {
    it('enforces view accessibility according to role matrix', () => {
      // Admin has full access
      expect(canAccessView('Admin', 'dashboard')).toBe(true);
      expect(canAccessView('Admin', 'settings')).toBe(true);
      expect(canAccessView('Admin', 'content')).toBe(true);
      expect(canAccessView('Admin', 'web-analytics')).toBe(true);

      // Creator has workflow access but no settings
      expect(canAccessView('Creator', 'dashboard')).toBe(true);
      expect(canAccessView('Creator', 'calendar')).toBe(true);
      expect(canAccessView('Creator', 'tasklist')).toBe(true);
      expect(canAccessView('Creator', 'content')).toBe(true);
      expect(canAccessView('Creator', 'meeting')).toBe(true);
      expect(canAccessView('Creator', 'analytics')).toBe(true);
      expect(canAccessView('Creator', 'settings')).toBe(false);

      // Viewer only has public dashboard, analytics, and web-analytics
      expect(canAccessView('Viewer', 'dashboard')).toBe(true);
      expect(canAccessView('Viewer', 'analytics')).toBe(true);
      expect(canAccessView('Viewer', 'web-analytics')).toBe(true);
      expect(canAccessView('Viewer', 'my-work')).toBe(false);
      expect(canAccessView('Viewer', 'calendar')).toBe(false);
      expect(canAccessView('Viewer', 'tasklist')).toBe(false);
      expect(canAccessView('Viewer', 'content')).toBe(false);
      expect(canAccessView('Viewer', 'meeting')).toBe(false);
      expect(canAccessView('Viewer', 'settings')).toBe(false);
    });
  });
});
