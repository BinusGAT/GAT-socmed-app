import { NextResponse } from 'next/server';

function getAllowedFrameAncestors() {
  const configured = process.env.ALLOWED_EMBED_ORIGINS || '';
  const origins = configured
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      try {
        return new URL(item).origin;
      } catch {
        return item;
      }
    });
  const unique = Array.from(new Set(origins));
  return unique.length > 0 ? `'self' ${unique.join(' ')}` : "'self'";
}

export function proxy(request) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const frameAncestors = getAllowedFrameAncestors();
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
    "object-src 'none'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' 'nonce-${nonce}' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
    "frame-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
