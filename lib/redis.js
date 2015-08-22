import redis from 'redis-url';
import coRedis from 'co-redis';
import koaRedis from 'koa-redis';
import session from 'koa-generic-session';
import debugname from 'debug';
const debug = debugname('hostr:redis');

const redisUrl = process.env.REDIS_URL || process.env.REDISTOGO_URL || 'redis://localhost:6379';

const connection = new Promise((resolve, reject) => {
  debug('Connecting to Redis');
  resolve(redis.connect(redisUrl));
}).catch((err) => {
  debug('Connection error: ' + err);
});

const redisSession = new Promise((resolve, reject) => {
  return connection.then((client) => {
    client = koaRedis({client: client});
    resolve(session({
      key: 'hid',
      store: client
    }));
  }).catch((err) => {
    debug('koa-redis error: ' + err);
    reject(err);
  });
});

const wrapped = new Promise((resolve, reject) => {
  return connection.then((client) => {
    client = coRedis(client);
    client.on('error', (err) => {
      debug('Client error: ' + err);
      reject(err);
    });
    client.on('ready', () => {
      debug('Successfully connected to Redis');
      resolve(client);
    });
  }).catch((err) => {
    debug('co-redis error: ' + err);
    reject(err);
  });
});

export function sessionStore() {
  return function* (next) {
    const sess = yield redisSession;
    yield sess.bind(this)(next);
  }
}

export function middleware() {
  return function* (next) {
    this.redis = yield wrapped;
    yield next;
  }
}
