import { createClient } from 'redis';
import { createMiddleware } from 'hono/factory';
import debugname from 'debug';

const debug = debugname('hostr:redis');

const client = createClient({ url: process.env.REDIS_URL });
client.on('error', (err) => debug('Redis error: ', err));

debug('Connecting to Redis');
await client.connect();
debug('Successfully connected to Redis');

export { client };

export function middleware() {
  return createMiddleware(async (c, next) => {
    c.set('redis', client);
    await next();
  });
}
