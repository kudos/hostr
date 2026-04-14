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
        const body = await c.req.parseBody();
        const token = body._csrf || c.req.query('_csrf');
        if (!token || token !== session.csrfToken) {
          throw new HTTPException(403, { message: 'Invalid CSRF token' });
        }
      }
    }

    await next();
  });
}
