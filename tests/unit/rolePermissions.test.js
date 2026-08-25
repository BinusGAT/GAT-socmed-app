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

  it('restricts creators from editing unassigned tasks or administrative attributes', () => {
    const assignedTask = { id: 'CT1', AssignedUserId: 'creator-1', PIC: 'Jane Doe', Category: 'News', contentTitle: 'Draft Title' };
    const unassignedTask = { id: 'CT2', AssignedUserId: 'creator-2', PIC: 'Alex Morgan', Category: 'Story Telling', contentTitle: 'Other Title' };

    expect(isTaskAssignedToUser(assignedTask, 'creator-1', 'Jane')).toBe(true);
    expect(isTaskAssignedToUser(unassignedTask, 'creator-1', 'Jane')).toBe(false);
  });
});
