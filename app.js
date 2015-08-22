import koa from 'koa';
import mount from 'koa-mount';
import route from 'koa-route';
import websockify from 'koa-websocket';
import redis from './lib/redis';
import co from 'co';
import api from './api/app';
import { events as fileEvents } from './api/routes/file';
import { events as userEvents } from './api/routes/user';
import web from './web/app';
import { init as storageInit } from './lib/storage';

import debugname from 'debug';
const debug = debugname('hostr');

storageInit();

const app = websockify(koa());

app.keys = [process.env.KEYS || 'INSECURE'];

app.ws.use(redis());

app.ws.use(route.all('/api/user', userEvents));
app.ws.use(route.all('/api/file/:id', fileEvents));

app.use(mount('/api', api));
app.use(mount('/', web));

if (!module.parent) {
  app.listen(process.env.PORT || 4040, function() {
    debug('Koa HTTP server listening on port ' + (process.env.PORT || 4040));
  });
  setInterval(function() {
    debug('%sMB', process.memoryUsage().rss / 1024 / 1024);
  }, 10000);
}

export default app;
