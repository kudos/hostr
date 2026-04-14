import { createHmac, timingSafeEqual } from 'crypto';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';

const COOKIE_NAME = 'sess';

function sign(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function encode(data, secret) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

function decode(cookie, secret) {
  const dot = cookie.lastIndexOf('.');
  if (dot < 0) return null;
  const payload = cookie.slice(0, dot);
  const sigBuf = Buffer.from(cookie.slice(dot + 1));
  const expectedBuf = Buffer.from(sign(payload, secret));
  try {
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;
  } catch {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return null;
  }
}

export function sessionMiddleware(secret) {
  return createMiddleware(async (c, next) => {
    const raw = getCookie(c, COOKIE_NAME);
    const session = raw ? (decode(raw, secret) ?? {}) : {};
    c.set('session', session);
    await next();
    const updated = c.get('session');
    if (!updated || Object.keys(updated).length === 0) {
      deleteCookie(c, COOKIE_NAME, { path: '/' });
    } else {
      setCookie(c, COOKIE_NAME, encode(updated, secret), {
        httpOnly: true,
        path: '/',
        sameSite: 'Lax',
      });
    }
  });
}
