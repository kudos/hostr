import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import gm from 'gm';
import parse from 'co-busboy';
import { upload as s3Upload } from '../../lib/s3';
import { sniff } from '../../lib/type';
import hostrId from '../../lib/hostr-id';
import malware from '../../lib/malware';
import { formatFile } from '../../lib/format';
import normalisedUser from '../../lib/normalised-user.js';

import debugname from 'debug';
const debug = debugname('hostr-api:file');

const baseURL = process.env.WEB_BASE_URL;
const storePath = process.env.UPLOAD_STORAGE_PATH;

export function* post(next) {
  if (!this.request.is('multipart/*')) {
    return yield next;
  }
  const user = yield normalisedUser.call(this, this.state.user);
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
  const count = yield this.rethink
    .table('files')
    .getAll(user.id, {index: 'userId'})
    .filter(this.rethink.row('status').ne('created').gt(new Date()))
    .count();
  const userLimit = user.daily_upload_allowance;
  const underLimit = (count < userLimit || userLimit === 'unlimited');
  if (!underLimit) {
    this.statsd.incr('file.overlimit', 1);
  }
  this.assert(underLimit, 400, `{
    "error": {
      "message": "Daily upload limits (${user.userdaily_upload_allowance}) exceeded.",
      "code": 602
    }
  }`);

  // Clean filename for storage, keep original for display
  upload.originalName = upload.filename;
  upload.filename = upload.filename.replace(/[^a-zA-Z0-9\.\-\_\s]/g, '').replace(/\s+/g, '');
  const stackId = this.params.id;
  const fileId = yield hostrId.call(this);

  // Fire an event to let the frontend map the GUID it sent to the real ID. Allows immediate linking to the file
  const acceptedEvent = `{"type": "file-accepted", "data": {"id": "${fileId}", "guid": "${tempGuid}", "href": "${baseURL}/${fileId}"}}`;
  this.redis.publish('/user/' + user.id, acceptedEvent);
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
  if (process.env.AWS_BUCKET) {
    upload.pipe(s3Upload(key));
  }

  const thumbsPromises = [
    new Promise((resolve) => {
      const small = gm(upload).resize(150, 150, '>').stream();
      if (process.env.AWS_BUCKET) {
        small.pipe(fs.createWriteStream(path.join(storePath, fileId[0], '150', fileId + '_' + upload.filename)));
        small.pipe(s3Upload(path.join('150', fileId + '_' + upload.filename))).on('finish', resolve);
      } else {
        small.pipe(fs.createWriteStream(path.join(storePath, fileId[0], '150', fileId + '_' + upload.filename))).on('finish', resolve);
      }
    }),
    new Promise((resolve) => {
      const medium = gm(upload).resize(970, '>').stream();
      if (process.env.AWS_BUCKET) {
        medium.pipe(fs.createWriteStream(path.join(storePath, fileId[0], '970', fileId + '_' + upload.filename)));
        medium.pipe(s3Upload(path.join('970', fileId + '_' + upload.filename))).on('finish', resolve);
      } else {
        medium.pipe(fs.createWriteStream(path.join(storePath, fileId[0], '970', fileId + '_' + upload.filename))).on('finish', resolve);
      }
    }),
  ];


  const dimensionsPromise = new Promise((resolve, reject) => {
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
    if (receivedSize > user.max_filesize) {
      fs.unlink(path.join(storePath, key));
      this.throw(413, '{"error": {"message": "The file you tried to upload is too large.", "code": 601}}');
    }

    percentComplete = Math.floor(receivedSize * 100 / expectedSize);
    if (percentComplete > lastPercent && lastTick < Date.now() - 1000) {
      const progressEvent = `{"type": "file-progress", "data": {"id": "${fileId}", "complete": ${percentComplete}}}`;
      this.redis.publish('/file/' + fileId, progressEvent);
      this.redis.publish('/user/' + user.id, progressEvent);
      lastTick = Date.now();
    }
    lastPercent = percentComplete;

    md5sum.update(data);
  });

  // Fire final upload progress event so users know it's now processing
  const completeEvent = `{"type": "file-progress", "data": {"id": "${fileId}", "complete": 100}}`;
  this.redis.publish('/file/' + fileId, completeEvent);
  this.redis.publish('/user/' + user.id, completeEvent);
  this.statsd.incr('file.upload.complete', 1);

  const dbFile = {
    id: fileId,
    stackId,
    userId: user.id,
    ip: remoteIp,
    name: upload.filename,
    originalName: upload.originalName,
    size: receivedSize,
    accessedCount: 0,
    s3: false,
    type: sniff(upload.filename),
    created: new Date(),
    updated: null,
    accessed: null,
    deleted: null,
  };

  yield this.rethink.table('files').insert(dbFile);
  yield uploadPromise;
  try {
    const dimensions = yield dimensionsPromise;
    dbFile.width = dimensions.width;
    dbFile.height = dimensions.height;
  } catch (err) {
    debug('Not an image');
  }

  yield thumbsPromises;

  dbFile.size = receivedSize;  // eslint-disable-line camelcase
  dbFile.status = 'active';
  dbFile.md5 = md5sum.digest('hex');

  const formattedFile = formatFile(dbFile);

  yield this.rethink
    .table('files')
    .get(fileId)
    .update(dbFile);

  // Fire upload complete event
  const addedEvent = `{"type": "file-added", "data": ${JSON.stringify(formattedFile)}}`;
  this.redis.publish('/file/' + fileId, addedEvent);
  this.redis.publish('/user/' + user.id, addedEvent);
  this.status = 201;
  this.body = formattedFile;

  if (process.env.VIRUSTOTAL_KEY) {
    // Check in the background
    process.nextTick(function* malwareScan() {
      debug('Malware Scan');
      const result = yield malware(dbFile);
      if (result) {
        dbFile.malware = result.positive;
        dbFile.virustotal = result;
        yield this.rethink
          .table('files')
          .get(fileId)
          .update(dbFile);
        if (result.positive) {
          this.statsd.incr('file.malware', 1);
        }
      }
    });
  } else {
    debug('Skipping Malware Scan, VIRUSTOTAL env variable not found.');
  }
}


export function* list() {
  let query = this.rethink
    .table('files')
    .getAll(this.state.user, {index: 'userId'});

  if (this.request.query.trashed) {
    query = query.filter(this.rethink.row('status').eq('trashed'), {default: true});
  } else if (this.request.query.all) {
    query = query.filter(this.rethink.row('status').ne('deleted'), {default: true});
  }

  let limit = 0;
  if (this.request.query.perpage > 0) {
    limit = parseInt(this.request.query.perpage / 1, 10);
    query = query.limit(limit);
  } else if (this.request.query.perpage !== '0') {
    query = query.limit(20);
  }

  if (this.request.query.page) {
    query = query.skip(parseInt(this.request.query.page - 1, 10) * limit);
  }

  const userFiles = yield query;

  userFiles.sort((first, second) => {
    return first.created < second.created;
  });

  this.statsd.incr('file.list', 1);
  this.body = userFiles.map(formatFile);
}


export function* get() {
  const file = yield this.rethink
    .table('files')
    .get(this.params.id);
  this.assert(file && (file.status === 'active' || file.status === 'uploading'), 404, '{"error": {"message": "File not found", "code": 604}}');
  const user = yield this.rethink.table('users').get(file.userId);
  this.assert(user && !user.banned, 404, '{"error": {"message": "File not found", "code": 604}}');
  this.statsd.incr('file.get', 1);
  this.body = formatFile(file);
}


export function* put() {
  if (this.request.body.trashed) {
    const status = this.request.body.trashed ? 'trashed' : 'active';
    const file = yield this.rethink.get(this.params.id);
    if (file.userId === this.state.user) {
      yield this.rethink.get(this.params.id).update({status: status});
    }
  }
}


export function* del() {
  const file = yield this.rethink.get(this.params.id);
  if (file.userId === this.state.user) {
    yield this.rethink.get(this.params.id).update({status: 'deleted'});
  }
  const event = {type: 'file-deleted', data: {'id': this.params.id}};
  yield this.redis.publish('/user/' + this.state.user, JSON.stringify(event));
  yield this.redis.publish('/file/' + file.id, JSON.stringify(event));
  this.statsd.incr('file.delete', 1);
  this.status = 204;
  this.body = '';
}
