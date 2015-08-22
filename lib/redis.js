import redis from 'redis-url';
import coRedis from 'co-redis';
import debugname from 'debug';
const debug = debugname('hostr:redis');

const redisUrl = process.env.REDIS_URL || process.env.REDISTOGO_URL || 'redis://localhost:6379';

let connection = new Promise((resolve, reject) => {
  debug('Connecting to Redis');
  const client = redis.connect(redisUrl);
  const wrapped = coRedis(client);
  wrapped.client = client;
  wrapped.on('error', (err) => {
    debug('Client error: ' + err);
  });
  wrapped.on('ready', () => {
    debug('Successfully connected to Redis');
    resolve(wrapped);
  });
}).catch((err) => {
  debug('Promise error: ' + err);
});

export default function () {
  return function* redisMiddleware(next) {
    this.redis = yield connection;
    yield next;
  }
}
