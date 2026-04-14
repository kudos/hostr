import { v4 as uuid } from 'uuid';
import { getCookie } from 'hono/cookie';
import { fromToken, fromCookie, setupSession } from '../lib/auth.js';
import { render } from '../lib/render.js';

export async function main(c) {
  const session = c.get('session');
  if (session.user) {
    if (c.req.query('app-token')) {
      return c.redirect('/');
    }
    const token = uuid();
    await c.get('redis').set(token, session.user.id, { EX: 604800 });
    session.user.token = token;
    c.set('session', session);
    return render(c, 'index', { user: session.user });
  }
  if (c.req.query('app-token')) {
    const user = await fromToken(c, c.req.query('app-token'));
    if (user) await setupSession(c, user);
    return c.redirect('/');
  }
  const rememberId = getCookie(c, 'r');
  if (rememberId) {
    const user = await fromCookie(rememberId);
    if (user) await setupSession(c, user);
    return c.redirect('/');
  }
  return render(c, 'marketing');
}

export async function staticPage(c) {
  const session = c.get('session');
  if (session.user) {
    const token = uuid();
    await c.get('redis').set(token, session.user.id, { EX: 604800 });
    session.user.token = token;
    c.set('session', session);
    return render(c, 'index', { user: session.user });
  }
  const { pathname } = new URL(c.req.url);
  switch (pathname) {
    case '/terms': return render(c, 'terms');
    case '/privacy': return render(c, 'privacy');
    case '/apps': return render(c, 'apps');
    case '/stats': return render(c, 'index', { user: {} });
    default: return c.notFound();
  }
}
