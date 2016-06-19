import path from 'path';
import koa from 'koa';
import logger from 'koa-logger';
import serve from 'koa-static';
import favicon from 'koa-favicon';
import compress from 'koa-compress';
import bodyparser from 'koa-bodyparser';
import websockify from 'koa-websocket';
import helmet from 'koa-helmet';
import raven from 'raven';
import mongo from './lib/mongo';
import * as redis from './lib/redis';
import api, { ws } from './api/app';
import web from './web/app';

import models from './models';

import debugname from 'debug';
const debug = debugname('hostr');

const app = websockify(koa());
app.keys = [process.env.COOKIE_KEY];

if (process.env.SENTRY_DSN) {
  const ravenClient = new raven.Client(process.env.SENTRY_DSN);
  ravenClient.patchGlobal();
  app.use(function* ravenMiddleware(next) {
    this.raven = ravenClient;
    yield next;
  });
  app.ws.use(function* ravenWsMiddleware(next) {
    this.raven = ravenClient;
    yield next;
  });
}

app.use(helmet());

app.use(function* errorMiddleware(next) {
  this.set('Server', 'Nintendo 64');
  if (this.req.headers['x-forwarded-proto'] === 'http') {
    this.redirect(`https://${this.req.headers.host}${this.req.url}`);
    return;
  }
  try {
    yield next;
  } catch (err) {
    if (!err.statusCode && this.raven) {
      this.raven.captureError(err);
    }
    throw err;
  }
});

app.use(mongo());
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
