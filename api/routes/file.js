import redis from 'redis';

import models from '../../models';
import { formatFile } from '../../lib/format';
import Uploader from '../../lib/uploader';

const redisUrl = process.env.REDIS_URL;

export function* post(next) {
  if (!this.request.is('multipart/*')) {
    yield next;
    return;
  }

  const uploader = new Uploader(this);

  yield uploader.checkLimit();
  yield uploader.accept();

  uploader.acceptedEvent();

  uploader.receive();

  yield uploader.promise;

  uploader.processingEvent();

  yield uploader.sendToSFTP();
  yield uploader.processImage();

  yield uploader.finalise();

  this.status = 201;
  this.body = formatFile(uploader.file);

  uploader.completeEvent();
  uploader.malwareScan();
}


export function* list() {
  let limit = 20;
  if (this.request.query.perpage === '0') {
    limit = 1000;
  } else if (this.request.query.perpage > 0) {
    limit = parseInt(this.request.query.perpage / 1, 10);
  }

  let offset = 0;
  if (this.request.query.page) {
    offset = parseInt(this.request.query.page - 1, 10) * limit;
  }

  const files = yield models.file.findAll({
    where: {
      userId: this.user.id,
      status: 'active',
    },
    order: '"createdAt" DESC',
    offset,
    limit,
  });

  this.statsd.incr('file.list', 1);
  this.body = files.map(formatFile);
}


export function* get() {
  const file = yield models.file.findOne({
    where: {
      id: this.params.id,
      status: {
        $in: ['active', 'uploading'],
      },
    },
  });
  this.assert(file, 404, '{"error": {"message": "File not found", "code": 604}}');
  const user = yield file.getUser();
  this.assert(user && !user.banned, 404, '{"error": {"message": "File not found", "code": 604}}');
  this.statsd.incr('file.get', 1);
  this.body = formatFile(file);
}


export function* put() {
  if (this.request.body.trashed) {
    const file = yield models.file.findOne({
      where: {
        id: this.params.id,
        userId: this.user.id,
      },
    });
    file.status = this.request.body.trashed ? 'trashed' : 'active';
    yield file.save();
  }
}


export function* del() {
  const file = yield models.file.findOne({
    where: {
      id: this.params.id,
      userId: this.user.id,
    },
  });
  this.assert(file, 401, '{"error": {"message": "File not found", "code": 604}}');
  file.status = 'deleted';
  yield file.save();
  const event = { type: 'file-deleted', data: { id: this.params.id } };
  yield this.redis.publish(`/file/${this.params.id}`, JSON.stringify(event));
  yield this.redis.publish(`/user/${this.user.id}`, JSON.stringify(event));
  this.statsd.incr('file.delete', 1);
  this.status = 204;
  this.body = '';
}


export function* events() {
  const pubsub = redis.createClient(redisUrl);
  pubsub.on('ready', () => {
    pubsub.subscribe(this.path);
  });

  pubsub.on('message', (channel, message) => {
    this.websocket.send(message);
  });
  this.websocket.on('close', () => {
    pubsub.quit();
  });
}
