export const SESSION_DURATION_MS = Object.freeze({
  PRIVILEGED: 4 * 60 * 60 * 1000,
  STANDARD: 8 * 60 * 60 * 1000,
});

const PRIVILEGED_ROLE_NAMES = new Set([
  'superadmin',
  'super admin',
  'super_admin',
  'super-admin',
  'admin',
]);

export function getSessionDurationMs(roleName) {
  const normalizedRole = String(roleName || '').trim().toLowerCase();
  return PRIVILEGED_ROLE_NAMES.has(normalizedRole)
    ? SESSION_DURATION_MS.PRIVILEGED
    : SESSION_DURATION_MS.STANDARD;
}
