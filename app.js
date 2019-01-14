import path from 'path';
import Koa from 'koa';
import logger from 'koa-logger';
import serve from 'koa-static';
import favicon from 'koa-favicon';
import compress from 'koa-compress';
import bodyparser from 'koa-bodyparser';
import websockify from 'koa-websocket';
import helmet from 'koa-helmet';
import session from 'koa-session';
import * as Sentry from '@sentry/node';
import debugname from 'debug';
import * as redis from './lib/redis';
import api, { ws } from './api/app';
import web from './web/app';

const debug = debugname('hostr');

const app = websockify(new Koa());
app.keys = [process.env.COOKIE_KEY];

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    release: `hostr@${process.env.GIT_REV}`,
  });
  app.on('error', (err) => {
    if (err.statusCode === 404) return;
    Sentry.captureException(err, (_err, eventId) => {
      debug('Reported error', eventId);
    });
  });
  app.use(async (ctx, next) => {
    ctx.Sentry = Sentry;
    await next();
  });
  app.ws.use(async (ctx, next) => {
    ctx.Sentry = Sentry;
    await next();
  });
}

app.use(helmet());

app.use(async (ctx, next) => {
  ctx.set('Server', 'Nintendo 64');
  if (ctx.req.headers['x-forwarded-proto'] === 'http') {
    ctx.redirect(`https://${ctx.req.headers.host}${ctx.req.url}`);
    return;
  }
  try {
    await next();
  } catch (err) {
    if (!err.statusCode && process.env.SENTRY_DSN) {
      Sentry.captureException(err, (_err, eventId) => {
        debug('Reported error', eventId);
      });
    }
    throw err;
  }
});

app.use(session(app));

app.use(redis.middleware());
if (process.env.DEBUG === 'true') {
  app.use(logger());
}
app.use(compress());
app.use(bodyparser());

app.use(favicon(path.join(__dirname, 'web/public/images/favicon.png')));
app.use(serve(path.join(__dirname, 'web/public/'), { maxage: 31536000000 }));

app.use(api.prefix('/api').routes());
app.use(web.prefix('').routes());

app.ws.use(redis.middleware());
app.ws.use(ws.prefix('/api').routes());

if (!module.parent) {
  app.listen(process.env.PORT || 4040, () => {
    debug('Koa HTTP server listening on port ', (process.env.PORT || 4040));
  });
}

export default app;
