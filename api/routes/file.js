import redis from 'redis';

import models from '../../models';
import { formatFile } from '../../lib/format';
import Uploader from '../../lib/uploader';

const redisUrl = process.env.REDIS_URL;

export async function post(ctx, next) {
  if (!ctx.request.is('multipart/*')) {
    await next();
    return;
  }

  const uploader = new Uploader(ctx);

  await uploader.checkLimit();

  await uploader.accept();
  await uploader.processImage();
  await uploader.finalise();

  ctx.status = 201;
  ctx.body = formatFile(uploader.file);

  uploader.completeEvent();
  uploader.malwareScan();
}


export async function list(ctx) {
  let limit = 20;
  if (ctx.request.query.perpage === '0') {
    limit = 1000;
  } else if (ctx.request.query.perpage > 0) {
    limit = parseInt(ctx.request.query.perpage / 1, 10);
  }

  let offset = 0;
  if (ctx.request.query.page) {
    offset = parseInt(ctx.request.query.page - 1, 10) * limit;
  }

  const files = await models.file.findAll({
    where: {
      userId: ctx.user.id,
      processed: true,
    },
    order: [
    ['createdAt', 'DESC'],
  ],
    offset,
    limit,
  });

  ctx.statsd.incr('file.list', 1);
  ctx.body = files.map(formatFile);
}


export async function get(ctx) {
  const file = await models.file.findOne({
    where: {
      id: ctx.params.id,
    },
  });
  ctx.assert(file, 404, '{"error": {"message": "File not found", "code": 604}}');
  const user = await file.getUser();
  ctx.assert(user && !user.banned, 404, '{"error": {"message": "File not found", "code": 604}}');
  ctx.statsd.incr('file.get', 1);
  ctx.body = formatFile(file);
}


export async function del(ctx) {
  const file = await models.file.findOne({
    where: {
      id: ctx.params.id,
      userId: ctx.user.id,
    },
  });
  ctx.assert(file, 401, '{"error": {"message": "File not found", "code": 604}}');
  await file.destroy();
  const event = { type: 'file-deleted', data: { id: ctx.params.id } };
  await ctx.redis.publish(`/file/${ctx.params.id}`, JSON.stringify(event));
  await ctx.redis.publish(`/user/${ctx.user.id}`, JSON.stringify(event));
  ctx.statsd.incr('file.delete', 1);
  ctx.status = 204;
  ctx.body = '';
}


export async function events(ctx) {
  const pubsub = redis.createClient(redisUrl);
  pubsub.on('ready', () => {
    pubsub.subscribe(ctx.path);
  });

  pubsub.on('message', (channel, message) => {
    ctx.websocket.send(message);
  });
  ctx.websocket.on('close', () => {
    pubsub.quit();
  });
}
