export const SESSION_COOKIE_NAME = 'gat_session';

export function getSessionCookieOptions(expiresAt) {
  const maxAge = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge,
    expires: new Date(expiresAt),
  };
}

export function getExpiredSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  };
}
