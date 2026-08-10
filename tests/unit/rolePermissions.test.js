import { describe, expect, it } from 'vitest';
import { canAccessView, getDefaultView, isTaskAssignedToUser } from '../../utils/rolePermissions';

describe('role-specific experience', () => {
  it('keeps administration views exclusive to admins', () => {
    expect(canAccessView('Admin', 'settings')).toBe(true);
    expect(canAccessView('Creator', 'settings')).toBe(false);
    expect(canAccessView('Viewer', 'settings')).toBe(false);
  });

  it('gives creators workflow views and viewers reporting views only', () => {
    expect(canAccessView('Creator', 'my-work')).toBe(true);
    expect(canAccessView('Creator', 'content')).toBe(true);
    expect(canAccessView('Viewer', 'my-work')).toBe(false);
    expect(canAccessView('Viewer', 'analytics')).toBe(true);
    expect(getDefaultView('Creator')).toBe('my-work');
    expect(getDefaultView('Viewer')).toBe('dashboard');
  });

  it('matches assignments by immutable user id with a legacy PIC fallback', () => {
    expect(isTaskAssignedToUser({ AssignedUserId: 'creator-1', PIC: 'Someone Else' }, 'creator-1', 'Alya')).toBe(true);
    expect(isTaskAssignedToUser({ AssignedUserId: 'creator-2', PIC: 'Alya' }, 'creator-1', 'Alya')).toBe(false);
    expect(isTaskAssignedToUser({ PIC: 'Alya Putri' }, 'creator-1', 'Alya')).toBe(true);
  });
});
