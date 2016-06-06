import redis from 'redis';

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

  yield uploader.save();
  yield uploader.promise;

  uploader.processingEvent();

  yield uploader.sendToSFTP();
  yield uploader.processImage();

  yield uploader.finalise();

  this.status = 201;
  this.body = uploader.toJSON();

  uploader.completeEvent();
  uploader.malwareScan();
}


export function* list() {
  const Files = this.db.Files;

  let status = 'active';
  if (this.request.query.trashed) {
    status = 'trashed';
  } else if (this.request.query.all) {
    status = { $in: ['active', 'trashed'] };
  }

  let limit = 20;
  if (this.request.query.perpage === '0') {
    limit = false;
  } else if (this.request.query.perpage > 0) {
    limit = parseInt(this.request.query.perpage / 1, 10);
  }

  let skip = 0;
  if (this.request.query.page) {
    skip = parseInt(this.request.query.page - 1, 10) * limit;
  }

  const queryOptions = {
    limit, skip, sort: [['time_added', 'desc']],
    hint: {
      owner: 1, status: 1, time_added: -1,
    },
  };

  const userFiles = yield Files.find({
    owner: this.user.id, status }, queryOptions).toArray();
  this.statsd.incr('file.list', 1);
  this.body = userFiles.map(formatFile);
}


export function* get() {
  const Files = this.db.Files;
  const Users = this.db.Users;
  const file = yield Files.findOne({ _id: this.params.id,
    status: { $in: ['active', 'uploading'] } });
  this.assert(file, 404, '{"error": {"message": "File not found", "code": 604}}');
  const user = yield Users.findOne({ _id: file.owner });
  this.assert(user && !user.banned, 404, '{"error": {"message": "File not found", "code": 604}}');
  this.statsd.incr('file.get', 1);
  this.body = formatFile(file);
}


export function* put() {
  if (this.request.body.trashed) {
    const Files = this.db.Files;
    const status = this.request.body.trashed ? 'trashed' : 'active';
    yield Files.updateOne({ _id: this.params.id, owner: this.user.id },
    { $set: { status } }, { w: 1 });
  }
}


export function* del() {
  yield this.db.Files.updateOne({ _id: this.params.id, owner: this.db.objectId(this.user.id) },
  { $set: { status: 'deleted' } }, { w: 1 });
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
