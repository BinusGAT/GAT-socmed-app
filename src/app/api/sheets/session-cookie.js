export const SESSION_COOKIE_NAME = 'gat_session';

export function getSessionCookieOptions(expiresAt) {
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  const configuredSameSite = (process.env.COOKIE_SAME_SITE || 'strict').toLowerCase();
  const sameSite = ['strict', 'lax', 'none'].includes(configuredSameSite) ? configuredSameSite : 'strict';
  const isProduction = process.env.NODE_ENV === 'production';
  const secure = sameSite === 'none' ? true : isProduction;

  const options = {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge,
    expires: new Date(expiresAt),
  };
  if (sameSite === 'none') {
    options.partitioned = true;
  }
  return options;
}

export function getExpiredSessionCookieOptions() {
  const configuredSameSite = (process.env.COOKIE_SAME_SITE || 'strict').toLowerCase();
  const sameSite = ['strict', 'lax', 'none'].includes(configuredSameSite) ? configuredSameSite : 'strict';
  const isProduction = process.env.NODE_ENV === 'production';
  const secure = sameSite === 'none' ? true : isProduction;

  const options = {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  };
  if (sameSite === 'none') {
    options.partitioned = true;
  }
  return options;
}
