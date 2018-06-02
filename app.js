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
import raven from 'raven';
import debugname from 'debug';
import * as redis from './lib/redis';
import api, { ws } from './api/app';
import web from './web/app';

const debug = debugname('hostr');

const app = websockify(new Koa());
app.keys = [process.env.COOKIE_KEY];

if (process.env.SENTRY_DSN) {
  const ravenClient = new raven.Client(process.env.SENTRY_DSN);
  ravenClient.patchGlobal();
  app.use(async (ctx, next) => {
    this.raven = ravenClient;
    await next();
  });
  app.ws.use(async (ctx, next) => {
    this.raven = ravenClient;
    await next();
  });
}

app.use(helmet());

app.use(async (ctx, next) => {
  ctx.set('Server', 'Nintendo 64');
  if (ctx.req.headers['x-forwarded-proto'] === 'http') {
    ctx.redirect(`https://${this.req.headers.host}${this.req.url}`);
    return;
  }
  try {
    await next();
  } catch (err) {
    if (!err.statusCode && ctx.raven) {
      ctx.raven.captureError(err);
    }
    throw err;
  }
});

app.use(session(app));

app.use(redis.middleware());
app.use(logger());
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
