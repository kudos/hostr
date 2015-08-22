import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import gm from 'gm';
import redis from 'redis-url';
import parse from 'co-busboy';
import { upload as s3Upload } from '../../lib/s3';
import { sniff } from '../../lib/type';
import hostrId from '../../lib/hostr-id';
import malware from '../../lib/malware';
import { formatFile } from '../../lib/format';

import debugname from 'debug';
const debug = debugname('hostr-api:file');

const redisUrl = process.env.REDIS_URL || process.env.REDISTOGO_URL || 'redis://localhost:6379';

const fileHost = process.env.FILE_HOST || 'http://localhost:4040';

const storePath = process.env.STORE_PATH || path.join(process.env.HOME, '.hostr', 'uploads');

export function* post(next) {
  if (!this.request.is('multipart/*')) {
    return yield next;
  }
  const Files = this.db.Files;

  const expectedSize = this.request.headers['content-length'];
  const tempGuid = this.request.headers['hostr-guid'];
  const remoteIp = this.request.headers['x-real-ip'] || this.req.connection.remoteAddress;

  const md5sum = crypto.createHash('md5');

  let lastPercent = 0;
  let percentComplete = 0;
  let lastTick = 0;
  let receivedSize = 0;

  // Receive upload
  debug('Parsing upload');
  const upload = yield parse(this, {autoFields: true, headers: this.request.headers, limits: { files: 1}, highWaterMark: 1000000});

  // Check daily upload limit
  const count = yield Files.count({owner: this.user.id, 'time_added': {'$gt': Math.ceil(Date.now() / 1000) - 86400}});
  const userLimit = this.user.daily_upload_allowance;
  const underLimit = (count < userLimit || userLimit === 'unlimited');
  if (!underLimit) {
    this.statsd.incr('file.overlimit', 1);
  }
  this.assert(underLimit, 400, `{
    "error": {
      "message": "Daily upload limits (${this.user.daily_upload_allowance}) exceeded.",
      "code": 602
    }
  }`);

  // Clean filename for storage, keep original for display
  upload.originalName = upload.filename;
  upload.filename = upload.filename.replace(/[^a-zA-Z0-9\.\-\_\s]/g, '').replace(/\s+/g, '');
  const fileId = yield hostrId(Files);

  // Fire an event to let the frontend map the GUID it sent to the real ID. Allows immediate linking to the file
  let acceptedEvent = `{"type": "file-accepted", "data": {"id": "${fileId}", "guid": "${tempGuid}", "href": "${fileHost}/${fileId}"}}`;
  this.redis.publish('/user/' + this.user.id, acceptedEvent);
  this.statsd.incr('file.upload.accepted', 1);

  const uploadPromise = new Promise((resolve, reject) => {
    upload.on('error', () => {
      this.statsd.incr('file.upload.error', 1);
      reject();
    });

    upload.on('end', () => {
      resolve();
    });
  });

  const key = path.join(fileId[0], fileId + '_' + upload.filename);
  const localStream = fs.createWriteStream(path.join(storePath, key));

  upload.pipe(localStream);
  upload.pipe(s3Upload(key));

  const thumbsPromises = [
    new Promise((resolve, reject) => {
      const small = gm(upload).resize(150, 150, '>').stream();
      small.pipe(fs.createWriteStream(path.join(storePath, fileId[0], '150', fileId + '_' + upload.filename)));
      small.pipe(s3Upload(path.join('150', fileId + '_' + upload.filename))).on('finish', resolve);
    }),
    new Promise((resolve, reject) => {
      const medium = gm(upload).resize(970, '>').stream();
      medium.pipe(fs.createWriteStream(path.join(storePath, fileId[0], '970', fileId + '_' + upload.filename)));
      medium.pipe(s3Upload(path.join('970', fileId + '_' + upload.filename))).on('finish', resolve);
    })
  ];


  let dimensionsPromise = new Promise((resolve, reject) => {
    gm(upload).size((err, size) => {
      if (err) {
        reject(err);
      } else {
        resolve(size);
      }
    });
  });

  upload.on('data', (data) => {
    receivedSize += data.length;
    if (receivedSize > this.user.max_filesize) {
      fs.unlink(path.join(storePath, key));
      this.throw(413, '{"error": {"message": "The file you tried to upload is too large.", "code": 601}}');
    }

    percentComplete = Math.floor(receivedSize * 100 / expectedSize);
    if (percentComplete > lastPercent && lastTick < Date.now() - 1000) {
      const progressEvent = `{"type": "file-progress", "data": {"id": "${fileId}", "complete": ${percentComplete}}}`;
      this.redis.publish('/file/' + fileId, progressEvent);
      this.redis.publish('/user/' + this.user.id, progressEvent);
      lastTick = Date.now();
    }
    lastPercent = percentComplete;

    md5sum.update(data);
  });

  // Fire final upload progress event so users know it's now processing
  const completeEvent = `{"type": "file-progress", "data": {"id": "${fileId}", "complete": 100}}`;
  this.redis.publish('/file/' + fileId, completeEvent);
  this.redis.publish('/user/' + this.user.id, completeEvent);
  this.statsd.incr('file.upload.complete', 1);

  const dbFile = {
    _id: fileId,
    owner: this.user.id,
    ip: remoteIp,
    'system_name': fileId,
    'file_name': upload.filename,
    'original_name': upload.originalName,
    'file_size': receivedSize,
    'time_added': Math.ceil(Date.now() / 1000),
    status: 'active',
    'last_accessed': null,
    s3: false,
    type: sniff(upload.filename)
  };

  yield Files.insertOne(dbFile);
  yield uploadPromise;
  try {
    const dimensions = yield dimensionsPromise;
    dbFile.width = dimensions.width;
    dbFile.height = dimensions.height;
  } catch (e) {
    debug('Not an image');
  }

  yield thumbsPromises;

  dbFile.file_size = receivedSize;  // eslint-disable-line camelcase
  dbFile.status = 'active';
  dbFile.md5 = md5sum.digest('hex');

  const formattedFile = formatFile(dbFile);

  delete dbFile._id;
  yield Files.updateOne({_id: fileId}, {$set: dbFile});

  // Fire upload complete event
  const addedEvent = `{"type": "file-added", "data": ${JSON.stringify(formattedFile)}}`;
  this.redis.publish('/file/' + fileId, addedEvent);
  this.redis.publish('/user/' + this.user.id, addedEvent);
  this.status = 201;
  this.body = formattedFile;

  if (process.env.VIRUSTOTAL) {
    // Check in the background
    process.nextTick(function*() {
      debug('Malware Scan');
      const { positive, result } = yield malware(dbFile);
      if (positive) {
        this.statsd.incr('file.malware', 1);
      }
      yield Files.updateOne({_id: fileId}, {'$set': {malware: positive, virustotal: result}});
    });
  } else {
    debug('Skipping Malware Scan, VIRUSTOTAL env variable not found.');
  }
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
  } else if(this.request.query.perpage > 0) {
    limit = parseInt(this.request.query.perpage / 1);
  }

  let skip = 0;
  if (this.request.query.page) {
    skip = parseInt(this.request.query.page - 1) * limit;
  }

  const queryOptions = {
    limit: limit, skip: skip, sort: [['time_added', 'desc']],
    hint: {
      owner: 1, status: 1, 'time_added': -1
    }
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
  const Files = this.db.Files;
  yield Files.updateOne({'_id': this.params.id, owner: this.db.ObjectId(this.user.id)}, {$set: {status: 'deleted'}}, {w: 1});
  const event = {type: 'file-deleted', data: {'id': this.params.id}};
  yield this.redis.publish('/user/' + this.user.id, JSON.stringify(event));
  yield this.redis.publish('/file/' + this.params.id, JSON.stringify(event));
  this.statsd.incr('file.delete', 1);
  this.status = 204;
  this.body = '';
}


export function* events() {
  const pubsub = redis.connect(redisUrl);
  pubsub.on('ready', () => {
    pubsub.subscribe(this.path);
  });

  pubsub.on('message', (channel, message) => {
    this.websocket.send(message);
  });
  this.websocket.on('close', function() {
    pubsub.quit();
  });
}
