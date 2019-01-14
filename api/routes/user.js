import uuid from 'node-uuid';
import redis from 'redis';
import co from 'co';
import passwords from 'passwords';
import debugname from 'debug';

import models from '../../models';

const debug = debugname('hostr-api:user');

const redisUrl = process.env.REDIS_URL;

export async function get(ctx) {
  ctx.body = ctx.user;
}

export async function token(ctx) {
  const token = uuid.v4(); // eslint-disable-line no-shadow
  await ctx.redis.set(token, ctx.user.id, 'EX', 86400);
  ctx.body = { token };
}

export async function transaction(ctx) {
  const transactions = await models.transaction.findAll({
    where: {
      userId: ctx.user.id,
    },
  });

  ctx.body = transactions.map(item => ({
    id: item.id,
    amount: item.amount / 100,
    date: item.date,
    description: item.description,
    type: 'direct',
  }));
}

export async function settings(ctx) {
  ctx.assert(
    ctx.request.body, 400,
    '{"error": {"message": "Current Password required to update account.", "code": 612}}',
  );
  ctx.assert(
    ctx.request.body.current_password, 400,
    '{"error": {"message": "Current Password required to update account.", "code": 612}}',
  );
  const user = await models.user.findById(ctx.user.id);
  ctx.assert(
    await passwords.match(ctx.request.body.current_password, user.password), 400,
    '{"error": {"message": "Incorrect password", "code": 606}}',
  );
  if (ctx.request.body.email && ctx.request.body.email !== user.email) {
    user.email = ctx.request.body.email;
  }
  if (ctx.request.body.new_password) {
    ctx.assert(
      ctx.request.body.new_password.length >= 7, 400,
      '{"error": {"message": "Password must be 7 or more characters long.", "code": 606}}',
    );
    user.password = await passwords.hash(ctx.request.body.new_password);
  }
  await user.save();
  ctx.body = {};
}

export async function events(ctx) {
  const pubsub = redis.createClient(redisUrl);
  pubsub.on('message', (channel, message) => {
    ctx.websocket.send(message);
  });
  pubsub.on('ready', () => {
    ctx.websocket.on('message', co.wrap(async (message) => {
      let json;
      try {
        json = JSON.parse(message);
      } catch (err) {
        debug('Invalid JSON for socket auth');
        ctx.websocket.send('Invalid authentication message. Bad JSON?');
        ctx.Sentry.captureException(err);
      }
      try {
        const reply = await ctx.redis.get(json.authorization);
        if (reply) {
          pubsub.subscribe(`/user/${reply}`);
          ctx.websocket.send('{"status":"active"}');
          debug('Subscribed to: /user/%s', reply);
        } else {
          ctx.websocket.send('Invalid authentication token.');
        }
      } catch (err) {
        debug(err);
        ctx.Sentry.captureException(err);
      }
    }));
  });
  ctx.websocket.on('close', () => {
    debug('Socket closed');
    pubsub.quit();
  });
}
