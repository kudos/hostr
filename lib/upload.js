import { join } from 'path';
import parse from 'co-busboy';
import fs from 'mz/fs';
import sizeOf from 'image-size';
import hostrId from './hostr-id';
import resize from './resize';
import { upload as sftpUpload } from './sftp';

import debugname from 'debug';
const debug = debugname('hostr-api:upload');

const storePath = process.env.UPLOAD_STORAGE_PATH;
const baseURL = process.env.WEB_BASE_URL;
const supported = ['jpg', 'png', 'gif'];

export function* checkLimit() {
  const count = yield this.db.Files.count({
    owner: this.user.id,
    time_added: {'$gt': Math.ceil(Date.now() / 1000) - 86400},
  });
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
  return true;
}

export function* accept() {
  yield checkLimit.call(this);

  const upload = yield parse(this, {
    autoFields: true,
    headers: this.request.headers,
    limits: { files: 1},
    highWaterMark: 1000000,
  });

  upload.promise = new Promise((resolve, reject) => {
    upload.on('error', (err) => {
      this.statsd.incr('file.upload.error', 1);
      debug(err);
      reject();
    });

    upload.on('end', () => {
      resolve();
    });
  });

  upload.tempGuid = this.request.headers['hostr-guid'];
  upload.originalName = upload.filename;
  upload.filename = upload.filename.replace(/[^a-zA-Z0-9\.\-\_\s]/g, '').replace(/\s+/g, '');
  upload.id = yield hostrId(this.db.Files);

  const acceptedEvent = `{"type": "file-accepted", "data": {"id": "${upload.id}", "guid": "${upload.tempGuid}", "href": "${baseURL}/${upload.id}"}}`;
  this.redis.publish('/user/' + this.user.id, acceptedEvent);
  this.statsd.incr('file.upload.accepted', 1);

  return upload;
}

export function resizeImage(upload, type, currentSize, newSize) {
  return resize(join(storePath, upload.path), type, currentSize, newSize).then((image) => {
    const path = join(upload.id[0], String(newSize.width), upload.id + '_' + upload.filename);
    debug('Writing file');
    debug(join(storePath, path));
    return fs.writeFile(join(storePath, path), image).then(() => {
      debug('Uploading file');
      return sftpUpload(join(storePath, path), join('hostr', 'uploads', path));
    }).catch(debug);
  }).catch(debug);
}

export function* processImage(upload) {
  debug('Processing image');
  return new Promise((resolve) => {
    const size = sizeOf(join(storePath, upload.path));
    debug('Size: ', size);
    if (!size.width || supported.indexOf(size.type) < 0) {
      resolve();
    }

    Promise.all([
      resizeImage(upload, size.type, size, {width: 150, height: 150}),
      resizeImage(upload, size.type, size, {width: 970}),
    ]).then(() => {
      resolve(size);
    });
  });
}

export function progressEvent() {
  percentComplete = Math.floor(receivedSize * 100 / expectedSize);
  if (percentComplete > lastPercent && lastTick < Date.now() - 1000) {
    const progressEvent = `{"type": "file-progress", "data": {"id": "${upload.id}", "complete": ${percentComplete}}}`;
    this.redis.publish('/file/' + upload.id, progressEvent);
    this.redis.publish('/user/' + this.user.id, progressEvent);
    lastTick = Date.now();
  }
  lastPercent = percentComplete;
}
