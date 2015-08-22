import path from 'path';
import koa from 'koa';
import mount from 'koa-mount';
import route from 'koa-route';
import logger from 'koa-logger';
import Router from 'koa-router';
import serve from 'koa-static';
import favicon from 'koa-favicon';
import compress from 'koa-compress';
import bodyparser from 'koa-bodyparser';
import websockify from 'koa-websocket';
import raven from 'raven';
import mongo from './lib/mongo';
import redis from './lib/redis';
import co from 'co';
import api from './api/app';
import web from './web/app';
import { init as storageInit } from './lib/storage';
storageInit();

import debugname from 'debug';
const debug = debugname('hostr');

if (process.env.SENTRY_DSN) {
  const ravenClient = new raven.Client(process.env.SENTRY_DSN);
  ravenClient.patchGlobal();
}

const app = websockify(koa());
app.keys = [process.env.KEYS || 'INSECURE'];

app.use(function* (next){
  this.set('Server', 'Nintendo 64');
  if(this.req.headers['x-forwarded-proto'] === 'http'){
    return this.redirect('https://' + this.req.headers.host + this.req.url);
  }
  yield next;
});

app.use(mongo());
app.use(redis());
app.use(logger());
app.use(compress());
app.use(bodyparser());

app.use(favicon(path.join(__dirname, 'web/public/images/favicon.png')));
app.use(serve(path.join(__dirname, 'web/public/'), {maxage: 31536000000}));

app.use(api.prefix('/api').routes());
app.use(web.prefix('').routes());

if (!module.parent) {
  app.listen(process.env.PORT || 4040, function() {
    debug('Koa HTTP server listening on port ' + (process.env.PORT || 4040));
  });
  setInterval(function() {
    debug('%sMB', process.memoryUsage().rss / 1024 / 1024);
  }, 10000);
}

export default app;
