import { createClient } from 'redis';
import debugname from 'debug';

const debug = debugname('hostr:redis');

const client = createClient({ url: process.env.REDIS_URL });
client.on('error', (err) => debug('Redis error: ', err));

debug('Connecting to Redis');
await client.connect();
debug('Successfully connected to Redis');

export function middleware() {
  return async (ctx, next) => {
    ctx.redis = client;
    await next();
  };
}
