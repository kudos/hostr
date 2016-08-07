import { join } from 'path';
import parse from 'co-busboy';
import crypto from 'crypto';
import fs from 'mz/fs';
import sizeOf from 'image-size';

import { formatFile } from './format';
import hostrId from './hostr-id';
import resize from './resize';
import malware from './malware';
import { sniff } from './type';

import debugname from 'debug';
const debug = debugname('hostr-api:uploader');

const storePath = process.env.UPLOAD_STORAGE_PATH;
const baseURL = process.env.WEB_BASE_URL;
const supported = ['jpeg', 'jpg', 'png', 'gif'];


export default class Uploader {
  constructor(context) {
    this.context = context;
    this.Files = context.db.Files;
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
    this.originalName = this.upload.filename;
    this.filename = this.upload.filename.replace(/[^a-zA-Z0-9\.\-_\s]/g, '').replace(/\s+/g, '');
    this.id = yield hostrId(this.Files);
  }

  receive() {
    this.path = join(this.id[0], `${this.id}_${this.filename}`);
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
        {"id": "${this.upload.id}", "complete": ${this.percentComplete}}}`;
        this.context.redis.publish(`/file/${this.upload.id}`, progressEvent);
        this.context.redis.publish(`/user/${this.context.user.id}`, progressEvent);
        this.lastTick = Date.now();
      }
      this.lastPercent = this.percentComplete;

      this.md5sum.update(data);
    });

    this.upload.on('end', () => {
      this.localStream.end();
    });

    this.upload.resume();
  }

  acceptedEvent() {
    const acceptedEvent = `{"type": "file-accepted", "data":
      {"id": "${this.id}", "guid": "${this.tempGuid}", "href": "${baseURL}/${this.id}"}}`;
    this.context.redis.publish(`/user/${this.context.user.id}`, acceptedEvent);
    this.context.statsd.incr('file.upload.accepted', 1);
  }

  processingEvent() {
    const processingEvent = `{"type": "file-progress", "data":
     {"id": "${this.id}", "complete": 100}}`;
    this.context.redis.publish(`/file/${this.id}`, processingEvent);
    this.context.redis.publish(`/user/${this.context.user.id}`, processingEvent);
    this.context.statsd.incr('file.upload.complete', 1);
  }

  completeEvent() {
    const completeEvent = `{"type": "file-added", "data": ${JSON.stringify(this.toDBFormat())}}`;
    this.context.redis.publish(`/file/${this.id}`, completeEvent);
    this.context.redis.publish(`/user/${this.context.user.id}`, completeEvent);
  }

  toDBFormat() {
    const formatted = {
      owner: this.context.user.id,
      ip: this.remoteIp,
      system_name: this.id,
      file_name: this.filename,
      original_name: this.originalName,
      file_size: this.receivedSize,
      time_added: Math.ceil(Date.now() / 1000),
      status: 'active',
      last_accessed: null,
      s3: false,
      type: sniff(this.filename),
    };

    if (this.width) {
      formatted.width = this.width;
      formatted.height = this.height;
    }

    return formatted;
  }

  save() {
    return this.Files.insertOne({ _id: this.id, ...this.toDBFormat() });
  }

  toJSON() {
    return formatFile({ _id: this.id, ...this.toDBFormat() });
  }

  *checkLimit() {
    const count = yield this.Files.count({
      owner: this.context.user.id,
      time_added: { $gt: Math.ceil(Date.now() / 1000) - 86400 },
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
    const dbFile = this.toDBFormat();
    dbFile.file_size = this.receivedSize;
    dbFile.status = 'active';
    dbFile.md5 = this.md5sum.digest('hex');

    if (this.width) {
      dbFile.width = this.width;
      dbFile.height = this.height;
    }

    yield this.Files.updateOne({ _id: this.id }, { $set: dbFile });
  }

  resizeImage(upload, type, currentSize, newSize) {
    return resize(join(storePath, this.path), type, currentSize, newSize).then((image) => {
      const path = join(this.id[0], String(newSize.width), `${this.id}_${this.filename}`);
      debug('Writing file');
      debug(join(storePath, path));
      return fs.writeFile(join(storePath, path), image).catch(debug);
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

      this.width = size.width;
      this.height = size.height;

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
          yield this.Files.updateOne({ _id: this.id },
            { $set: { malware: result.positive, virustotal: result } });
          if (result.positive) {
            this.context.statsd.incr('file.malware', 1);
          }
        }
      });
    } else {
      debug('Skipping Malware Scan, VIRUSTOTAL env variable not found.');
    }
  }
}
