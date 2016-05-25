import path from 'path';
import crypto from 'crypto';
import fs from 'mz/fs';
import redis from 'redis';

import { sniff } from '../../lib/type';
import malware from '../../lib/malware';
import { formatFile } from '../../lib/format';
import { accept, processImage } from '../../lib/upload';

import debugname from 'debug';
const debug = debugname('hostr-api:file');

const redisUrl = process.env.REDIS_URL;

const storePath = process.env.UPLOAD_STORAGE_PATH;

export function* post(next) {
  if (!this.request.is('multipart/*')) {
    return yield next;
  }
  const Files = this.db.Files;

  const expectedSize = this.request.headers['content-length'];
  const remoteIp = this.request.headers['x-real-ip'] || this.req.connection.remoteAddress;
  const md5sum = crypto.createHash('md5');

  let lastPercent = 0;
  let percentComplete = 0;
  let lastTick = 0;
  let receivedSize = 0;

  const upload = yield accept.call(this);

  upload.path = path.join(upload.id[0], upload.id + '_' + upload.filename);
  const localStream = fs.createWriteStream(path.join(storePath, upload.path));

  upload.pipe(localStream);

  upload.on('data', (data) => {
    receivedSize += data.length;
    if (receivedSize > this.user.max_filesize) {
      fs.unlink(path.join(storePath, key));
      this.throw(413, '{"error": {"message": "The file you tried to upload is too large.", "code": 601}}');
    }

    percentComplete = Math.floor(receivedSize * 100 / expectedSize);
    if (percentComplete > lastPercent && lastTick < Date.now() - 1000) {
      const progressEvent = `{"type": "file-progress", "data": {"id": "${upload.id}", "complete": ${percentComplete}}}`;
      this.redis.publish('/file/' + upload.id, progressEvent);
      this.redis.publish('/user/' + this.user.id, progressEvent);
      lastTick = Date.now();
    }
    lastPercent = percentComplete;

    md5sum.update(data);
  });

  const dbFile = {
    owner: this.user.id,
    ip: remoteIp,
    'system_name': upload.id,
    'file_name': upload.filename,
    'original_name': upload.originalName,
    'file_size': receivedSize,
    'time_added': Math.ceil(Date.now() / 1000),
    status: 'active',
    'last_accessed': null,
    s3: false,
    type: sniff(upload.filename),
  };

  yield Files.insertOne({_id: upload.id, ...dbFile});

  yield upload.promise;

  const completeEvent = `{"type": "file-progress", "data": {"id": "${upload.id}", "complete": 100}}`;
  this.redis.publish('/file/' + upload.id, completeEvent);
  this.redis.publish('/user/' + this.user.id, completeEvent);
  this.statsd.incr('file.upload.complete', 1);

  const size = yield processImage(upload);

  dbFile.width = size.width;
  dbFile.height = size.height;
  dbFile.file_size = receivedSize;  // eslint-disable-line camelcase
  dbFile.status = 'active';
  dbFile.md5 = md5sum.digest('hex');

  const formattedFile = formatFile({_id: upload.id, ...dbFile});

  yield Files.updateOne({_id: upload.id}, {$set: dbFile});

  const addedEvent = `{"type": "file-added", "data": ${JSON.stringify(formattedFile)}}`;
  this.redis.publish('/file/' + upload.id, addedEvent);
  this.redis.publish('/user/' + this.user.id, addedEvent);

  this.status = 201;
  this.body = formattedFile;
}


export function* list() {
  const Files = this.db.Files;

  let status = 'active';
  if (this.request.query.trashed) {
    status = 'trashed';
  } else if (this.request.query.all) {
    status = {'$in': ['active', 'trashed']};
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
    limit: limit, skip: skip, sort: [['time_added', 'desc']],
    hint: {
      owner: 1, status: 1, 'time_added': -1,
    },
  };

  const userFiles = yield Files.find({owner: this.user.id, status: status}, queryOptions).toArray();
  this.statsd.incr('file.list', 1);
  this.body = userFiles.map(formatFile);
}


export function* get() {
  const Files = this.db.Files;
  const Users = this.db.Users;
  const file = yield Files.findOne({_id: this.params.id, status: {'$in': ['active', 'uploading']}});
  this.assert(file, 404, '{"error": {"message": "File not found", "code": 604}}');
  const user = yield Users.findOne({_id: file.owner});
  this.assert(user && !user.banned, 404, '{"error": {"message": "File not found", "code": 604}}');
  this.statsd.incr('file.get', 1);
  this.body = formatFile(file);
}


export function* put() {
  if (this.request.body.trashed) {
    const Files = this.db.Files;
    const status = this.request.body.trashed ? 'trashed' : 'active';
    yield Files.updateOne({'_id': this.params.id, owner: this.user.id}, {$set: {status: status}}, {w: 1});
  }
}


export function* del() {
  yield this.db.Files.updateOne({'_id': this.params.id, owner: this.db.objectId(this.user.id)}, {$set: {status: 'deleted'}}, {w: 1});
  const event = {type: 'file-deleted', data: {'id': this.params.id}};
  yield this.redis.publish('/user/' + this.user.id, JSON.stringify(event));
  yield this.redis.publish('/file/' + this.params.id, JSON.stringify(event));
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
