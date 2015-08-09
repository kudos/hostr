import koa from 'koa';
import mount from 'koa-mount';
import route from 'koa-route';
import websockify from 'koa-websocket';
import redis from 'redis-url';
import coRedis from 'co-redis';
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

const redisUrl = process.env.REDIS_URL || process.env.REDISTOGO_URL || 'redis://localhost:6379';

let coRedisConn = {};

co(function*() {
  coRedisConn = coRedis(redis.connect(redisUrl));
  coRedisConn.on('error', function (err) {
    debug('Redis error ' + err);
  });
}).catch(function(err) {
  console.error(err);
});
app.ws.use(function*(next) {
  this.redis = coRedisConn;
  yield next;
});

app.ws.use(route.all('/api/user', userEvents));
app.ws.use(route.all('/api/file/:id', fileEvents));

app.use(mount('/api', api));
app.use(mount('/', web));

if (!module.parent) {
  app.listen(process.env.PORT || 4040, function() {
    debug('Koa HTTP server listening on port ' + (process.env.PORT || 4040));
  });
}

module.exports = app;
