import { join } from 'path';
import parse from 'co-busboy';
import crypto from 'crypto';
import fs from 'mz/fs';
import sizeOf from 'image-size';

import models from '../models';
import createHostrId from './hostr-id';
import { formatFile } from './format';
import resize from './resize';
import malware from './malware';
import { sniff } from './type';
import { upload as sftpUpload } from './sftp';

import debugname from 'debug';
const debug = debugname('hostr-api:uploader');

const storePath = process.env.UPLOAD_STORAGE_PATH;
const baseURL = process.env.WEB_BASE_URL;
const supported = ['jpeg', 'jpg', 'png', 'gif'];


export default class Uploader {
  constructor(context) {
    this.context = context;
    this.expectedSize = context.request.headers['content-length'];
    this.tempGuid = context.request.headers['hostr-guid'];
    this.remoteIp = context.request.headers['x-real-ip'] || context.req.connection.remoteAddress;
    this.md5sum = crypto.createHash('md5');

    this.lastPercent = 0;
    this.percentComplete = 0;
    this.lastTick = 0;
    this.receivedSize = 0;
  }

  *accept() {
    this.upload = yield parse(this.context, {
      autoFields: true,
      headers: this.context.request.headers,
      limits: { files: 1 },
      highWaterMark: 10000000,
    });

    this.promise = new Promise((resolve, reject) => {
      this.upload.on('error', (err) => {
        this.statsd.incr('file.upload.error', 1);
        debug(err);
        reject();
      });

      this.upload.on('end', () => {
        resolve();
      });
    });

    this.tempGuid = this.tempGuid;
    this.file = yield models.file.create({
      id: yield createHostrId(),
      name: this.upload.filename.replace(/[^a-zA-Z0-9\.\-_\s]/g, '').replace(/\s+/g, ''),
      originalName: this.upload.filename,
      userId: this.context.user.id,
      status: 'uploading',
      type: sniff(this.upload.filename),
      ip: this.remoteIp,
      accessedAt: null,
      width: null,
      height: null,
    });
    yield this.file.save();
  }

  receive() {
    this.path = join(this.file.id[0], `${this.file.id}_${this.file.name}`);
    this.localStream = fs.createWriteStream(join(storePath, this.path));

    this.upload.pause();

    this.upload.on('data', (data) => {
      this.receivedSize += data.length;
      if (this.receivedSize > this.context.user.max_filesize) {
        fs.unlink(join(storePath, this.path));
        this.context.throw(413, `{"error": {"message": "The file you tried to upload is too large.",
        "code": 601}}`);
      }

      this.localStream.write(data);

      this.percentComplete = Math.floor(this.receivedSize * 100 / this.expectedSize);
      if (this.percentComplete > this.lastPercent && this.lastTick < Date.now() - 1000) {
        const progressEvent = `{"type": "file-progress", "data":
        {"id": "${this.file.id}", "complete": ${this.percentComplete}}}`;
        this.context.redis.publish(`/file/${this.file.id}`, progressEvent);
        this.context.redis.publish(`/user/${this.context.user.id}`, progressEvent);
        this.lastTick = Date.now();
      }
      this.lastPercent = this.percentComplete;

      this.md5sum.update(data);
    });

    this.upload.on('end', () => {
      this.file.size = this.receivedSize;
      this.file.md5 = this.md5sum.digest('hex');
      this.localStream.end();
    });

    this.upload.resume();
  }

  sendToSFTP() {
    return sftpUpload(join(storePath, this.path), join('hostr', 'uploads', this.path));
  }

  acceptedEvent() {
    const accepted = `{"type": "file-accepted", "data":
      {"id": "${this.file.id}", "guid": "${this.tempGuid}", "href": "${baseURL}/${this.file.id}"}}`;
    this.context.redis.publish(`/user/${this.context.user.id}`, accepted);
    this.context.statsd.incr('file.upload.accepted', 1);
  }

  processingEvent() {
    const processing = `{"type": "file-progress", "data":
     {"id": "${this.file.id}", "complete": 100}}`;
    this.context.redis.publish(`/file/${this.file.id}`, processing);
    this.context.redis.publish(`/user/${this.context.user.id}`, processing);
    this.context.statsd.incr('file.upload.complete', 1);
  }

  completeEvent() {
    const complete = `{"type": "file-added", "data": ${JSON.stringify(formatFile(this.file))}}`;
    this.context.redis.publish(`/file/${this.file.id}`, complete);
    this.context.redis.publish(`/user/${this.context.user.id}`, complete);
  }

  *checkLimit() {
    const count = yield models.file.count({
      where: {
        userId: this.context.user.id,
        createdAt: {
          $gt: Date.now() - 86400000,
        },
      },
    });
    const userLimit = this.context.user.daily_upload_allowance;
    const underLimit = (count < userLimit || userLimit === 'unlimited');
    if (!underLimit) {
      this.context.statsd.incr('file.overlimit', 1);
    }
    this.context.assert(underLimit, 400, `{
      "error": {
        "message": "Daily upload limits (${this.context.user.daily_upload_allowance}) exceeded.",
        "code": 602
      }
    }`);
    return true;
  }

  *finalise() {
    this.file.size = this.receivedSize;
    this.file.status = 'active';
    this.file.processed = 'true';
    yield this.file.save();
  }

  resizeImage(upload, type, currentSize, dim) {
    return resize(join(storePath, this.path), type, currentSize, dim).then((image) => {
      const path = join(this.file.id[0], String(dim.width), `${this.file.id}_${this.file.name}`);
      debug('Writing file');
      debug(join(storePath, path));
      return fs.writeFile(join(storePath, path), image).then(() => {
        debug('Uploading file');
        return sftpUpload(join(storePath, path), join('hostr', 'uploads', path));
      }).catch(debug);
    }).catch(debug);
  }

  *processImage(upload) {
    return new Promise((resolve) => {
      let size;
      try {
        if (supported.indexOf(this.path.split('.').pop().toLowerCase()) < 0) {
          resolve();
          return;
        }
        size = sizeOf(join(storePath, this.path));
      } catch (err) {
        debug(err);
        resolve();
        return;
      }

      if (!size.width || supported.indexOf(size.type) < 0) {
        resolve();
        return;
      }

      this.file.width = size.width;
      this.file.height = size.height;

      Promise.all([
        this.resizeImage(upload, size.type, size, { width: 150, height: 150 }),
        this.resizeImage(upload, size.type, size, { width: 970 }),
      ]).then(() => {
        resolve(size);
      });
    });
  }

  malwareScan() {
    if (process.env.VIRUSTOTAL_KEY) {
      // Check in the background
      process.nextTick(function* scan() {
        debug('Malware Scan');
        const result = yield malware(this);
        if (result) {
          this.file.malwarePositives = result.positives;
          this.file.save();
          const fileMalware = yield models.malware.create({
            fileId: this.file.id,
            positives: result.positives,
            virustotal: result,
          });
          fileMalware.save();
          if (result.positive > 5) {
            this.context.statsd.incr('file.malware', 1);
          }
        }
      });
    } else {
      debug('Skipping Malware Scan, VIRUSTOTAL env variable not found.');
    }
  }
}
