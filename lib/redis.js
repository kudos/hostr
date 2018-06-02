import redis from 'redis';
import coRedis from 'co-redis';
import koaRedis from 'koa-redis';
import session from 'koa-generic-session';
import debugname from 'debug';

const debug = debugname('hostr:redis');

const connection = new Promise((resolve, reject) => {
  debug('Connecting to Redis');
  const client = redis.createClient(process.env.REDIS_URL);
  client.on('error', reject);
  resolve(client);
}).catch((err) => {
  debug('Connection error: ', err);
  throw err;
});

const redisSession = new Promise((resolve, reject) =>
  connection.then((client) => {
    const sessionClient = koaRedis({ client });
    resolve(session({
      key: 'hid',
      store: sessionClient,
    }));
  }).catch((err) => {
    debug('koa-redis error: ', err);
    reject(err);
  }));

const wrapped = new Promise((resolve, reject) =>
  connection.then((client) => {
    const asyncClient = coRedis(client);
    asyncClient.on('error', reject);
    asyncClient.on('ready', () => {
      debug('Successfully connected to Redis');
      resolve(asyncClient);
    });
  }).catch((err) => {
    debug('co-redis error: ', err);
    reject(err);
    throw err;
  }));

export function sessionStore() {
  return async (ctx, next) => {
    const sess = await redisSession;
    await sess.bind(ctx)(next());
  };
}

export function middleware() {
  return async (ctx, next) => {
    ctx.redis = await wrapped;
    await next();
  };
}
