export const ROLES = Object.freeze({
  ADMIN: 'Admin',
  CREATOR: 'Creator',
  VIEWER: 'Viewer',
});

const READ_ACTIONS = new Set(['read_all', 'list_sessions', 'revoke_session', 'logout']);
const CREATOR_ACTIONS = new Set([
  'save_script',
  'save_schedule',
  'delete_schedule',
  'delete_script',
  'save_meeting',
  'delete_meeting',
  'save_ga_summary',
  'save_ga_item',
  'delete_ga_item',
]);

export function getAllowedRoles(action) {
  if (READ_ACTIONS.has(action)) {
    return [ROLES.ADMIN, ROLES.CREATOR, ROLES.VIEWER];
  }

  if (CREATOR_ACTIONS.has(action)) {
    return [ROLES.ADMIN, ROLES.CREATOR];
  }

  return [ROLES.ADMIN];
}

export function isRoleAllowed(action, role) {
  return getAllowedRoles(action).includes(role);
}

