import redis from 'redis-url';
import coRedis from 'co-redis';
import koaRedis from 'koa-redis';
import session from 'koa-generic-session';
import debugname from 'debug';
const debug = debugname('hostr:redis');

const redisUrl = process.env.REDIS_URL || process.env.REDISTOGO_URL || 'redis://localhost:6379';

const connection = new Promise((resolve, reject) => {
  debug('Connecting to Redis');
  const client = redis.connect(redisUrl);
  client.on('error', reject);
  resolve(client);
}).catch((err) => {
  debug('Connection error: ' + err);
  throw err;
});

const redisSession = new Promise((resolve, reject) => {
  return connection.then((client) => {
    const sessionClient = koaRedis({client: client});
    resolve(session({
      key: 'hid',
      store: sessionClient,
    }));
  }).catch((err) => {
    debug('koa-redis error: ' + err);
    reject(err);
  });
});

const wrapped = new Promise((resolve, reject) => {
  return connection.then((client) => {
    const asyncClient = coRedis(client);
    asyncClient.on('error', reject);
    asyncClient.on('ready', () => {
      debug('Successfully connected to Redis');
      resolve(asyncClient);
    });
  }).catch((err) => {
    debug('co-redis error: ' + err);
    reject(err);
    throw err;
  });
});

export function sessionStore() {
  return function* sessionStoreMiddleware(next) {
    const sess = yield redisSession;
    yield sess.bind(this)(next);
  };
}

export function middleware() {
  return function* redisMiddleware(next) {
    this.redis = yield wrapped;
    yield next;
  };
}
