import { randomBytes } from 'crypto';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';

export function csrfMiddleware() {
  return createMiddleware(async (c, next) => {
    const session = c.get('session');

    if (!session.csrfToken) {
      session.csrfToken = randomBytes(24).toString('hex');
      c.set('session', session);
    }
    c.set('csrf', session.csrfToken);

    const { method } = c.req;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const contentType = c.req.header('content-type') || '';
      if (!contentType.includes('multipart/')) {
        let token;
        if (contentType.includes('application/json')) {
          const jsonBody = await c.req.json().catch(() => ({}));
          token = jsonBody._csrf;
        } else {
          const body = await c.req.parseBody();
          token = body._csrf;
        }
        token = token || c.req.query('_csrf');
        if (!token || token !== session.csrfToken) {
          throw new HTTPException(403, { message: 'Invalid CSRF token' });
        }
      }
    }

    await next();
  });
}
