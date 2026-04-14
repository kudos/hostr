import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { compress } from 'hono/compress';
import { secureHeaders } from 'hono/secure-headers';
import { logger } from 'hono/logger';
import debugname from 'debug';
import { sessionMiddleware } from './lib/session.js';
import * as redis from './lib/redis.js';
import { attachWebSocket } from './lib/websocket.js';
import api from './api/app.js';
import web from './web/app.js';

const debug = debugname('hostr');

const app = new Hono();

app.use(secureHeaders({ contentSecurityPolicy: false }));
app.use(async (c, next) => {
  await next();
  c.header('Server', 'Nintendo 64');
});
app.use(sessionMiddleware(process.env.COOKIE_KEY));
app.use(redis.middleware());

if (process.env.NODE_ENV === 'development') {
  app.use(logger());
}

app.use(compress());

// Long-term cache for versioned static assets
const longCache = async (c, next) => {
  await next();
  c.header('Cache-Control', 'public, max-age=31536000, immutable');
};
app.use('/images/*', longCache);
app.use('/styles/*', longCache);
app.use('/build/*', longCache);

app.use('/favicon.ico', serveStatic({ path: './web/public/images/favicon.png' }));
app.use('/*', serveStatic({ root: './web/public/' }));

app.route('/api', api);
app.route('/', web);

app.onError((err, c) => {
  if (err?.status !== 404) debug(err);
});

if (process.argv[1] === import.meta.filename) {
  const server = serve(
    { fetch: app.fetch, port: parseInt(process.env.PORT || '4040', 10) },
    () => debug('Hono server listening on port', process.env.PORT || 4040),
  );
  attachWebSocket(server);
}

export default app;
