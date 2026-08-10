export const ROLE_VIEWS = Object.freeze({
  Admin: ['dashboard', 'my-work', 'calendar', 'tasklist', 'content', 'meeting', 'analytics', 'web-analytics', 'settings'],
  Creator: ['dashboard', 'my-work', 'calendar', 'tasklist', 'content', 'meeting', 'analytics', 'web-analytics'],
  Viewer: ['dashboard', 'analytics', 'web-analytics'],
});

export function canAccessView(role, view) {
  return (ROLE_VIEWS[role] || []).includes(view);
}

export function getDefaultView(role) {
  return role === 'Creator' ? 'my-work' : 'dashboard';
}

export function isTaskAssignedToUser(task, userId, userName) {
  if (!task) return false;
  if (String(task.AssignedUserId || task.assignedUserId || '') === String(userId || '')) return Boolean(userId);
  const picValue = task.PIC || task.pic;
  if (task.AssignedUserId || task.assignedUserId || !picValue || !userName) return false;
  const pic = String(picValue).trim().toLowerCase();
  const name = String(userName).trim().toLowerCase();
  return pic === name || pic.split(/\s+/)[0] === name.split(/\s+/)[0];
}
