export const ROLES = Object.freeze({
  ADMIN: 'Admin',
  CREATOR: 'Creator',
  VIEWER: 'Viewer',
});

const READ_ACTIONS = new Set(['read_all', 'logout']);
const CREATOR_ACTIONS = new Set([
  'save_script',
  'save_schedule',
  'save_ga_summary',
  'save_ga_item',
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

export function getVisibleAuditRows(role, rows) {
  return role === ROLES.ADMIN ? rows : [];
}

export function isTrustedRequestOrigin(origin, expectedOrigin) {
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(expectedOrigin).origin;
  } catch {
    return false;
  }
}

export function getExpectedRequestOrigin(
  fallbackOrigin,
  configuredOrigin = process.env.APP_ORIGIN,
  environment = process.env.NODE_ENV,
) {
  // A development server can legitimately be opened through localhost or a
  // LAN address. Validate against the origin that served the request in that
  // environment; production remains pinned to APP_ORIGIN when configured.
  const candidate = environment === 'development'
    ? fallbackOrigin
    : configuredOrigin || fallbackOrigin;
  try {
    return new URL(candidate).origin;
  } catch {
    return fallbackOrigin;
  }
}

export function getRequestServingOrigin(
  fallbackOrigin,
  hostHeader,
  forwardedProtocol,
  environment = process.env.NODE_ENV,
) {
  if (environment !== 'development' || !hostHeader) return fallbackOrigin;

  try {
    const fallbackUrl = new URL(fallbackOrigin);
    const protocol = String(forwardedProtocol || fallbackUrl.protocol)
      .split(',')[0]
      .trim()
      .replace(/:$/, '');
    if (!['http', 'https'].includes(protocol)) return fallbackOrigin;
    return new URL(`${protocol}://${hostHeader}`).origin;
  } catch {
    return fallbackOrigin;
  }
}
