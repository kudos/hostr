import { join } from 'path';
import Busboy from 'busboy';
import crypto from 'crypto';
import fs from 'mz/fs';
import sizeOf from 'image-size';
import debugname from 'debug';

import models from '../models';
import createHostrId from './hostr-id';
import { formatFile } from './format';
import resize from './resize';
import malware from './malware';
import sniff from './sniff';
import { upload as s3upload } from './s3';

const debug = debugname('hostr-api:uploader');

const storePath = process.env.UPLOAD_STORAGE_PATH;
const baseURL = process.env.WEB_BASE_URL;
const supported = ['jpeg', 'jpg', 'png', 'gif'];


export default class Uploader {
  constructor(context) {
    this.context = context;
    this.expectedSize = context.request.headers['content-length'];
    this.tempGuid = context.request.headers['hostr-guid'];
    this.remoteIp = context.request.headers['x-forwarded-for'] || context.req.connection.remoteAddress;
    this.md5sum = crypto.createHash('md5');

    this.lastPercent = 0;
    this.percentComplete = 0;
    this.lastTick = 0;
    this.receivedSize = 0;
  }

  async checkLimit() {
    const count = await models.file.count({
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

  async accept() {
    return new Promise((resolve) => {
      this.upload = new Busboy({
        autoFields: true,
        headers: this.context.request.headers,
        limits: { files: 1 },
        highWaterMark: 10000000,
      });

      this.upload.on('file', async (fieldname, file, filename) => {
        this.upload.filename = filename;

        this.file = await models.file.create({
          id: await createHostrId(),
          name: this.upload.filename.replace(/[^a-zA-Z0-9\.\-_\s]/g, '').replace(/\s+/g, ''), // eslint-disable-line no-useless-escape
          originalName: this.upload.filename,
          userId: this.context.user.id,
          status: 'uploading',
          type: sniff(this.upload.filename),
          ip: this.remoteIp,
          accessedAt: null,
          width: null,
          height: null,
        });
        await this.file.save();

        this.path = join(this.file.id[0], `${this.file.id}_${this.file.name}`);
        this.localStream = fs.createWriteStream(join(storePath, this.path));
        this.localStream.on('finish', () => {
          resolve();
        });


        file.on('data', (data) => {
          this.receivedSize += data.length;
          if (this.receivedSize > this.context.user.max_filesize) {
            fs.unlink(join(storePath, this.path));
            this.context.throw(413, `{"error": {"message": "The file you uploaded is too large.",
            "code": 601}}`);
          }

          this.localStream.write(data);

          this.percentComplete = Math.floor((this.receivedSize * 100) / this.expectedSize);
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

        debug('accepted');
        const accepted = `{"type": "file-accepted", "data":
          {"id": "${this.file.id}", "guid": "${this.tempGuid}", "href": "${baseURL}/${this.file.id}"}}`;
        this.context.redis.publish(`/user/${this.context.user.id}`, accepted);
        this.context.statsd.incr('file.upload.accepted', 1);

        file.on('end', () => {
          this.file.size = this.receivedSize;
          this.file.md5 = this.md5sum.digest('hex');
          this.localStream.end();
          this.processingEvent();
        });

        this.localStream.on('end', () => {
          s3upload(fs.createReadStream(join(storePath, this.path)), this.path);
        });
      });
      this.context.req.pipe(this.upload);
    });
  }

  processingEvent() {
    debug('processing');
    const processing = `{"type": "file-progress", "data":
     {"id": "${this.file.id}", "complete": 100}}`;
    this.context.redis.publish(`/file/${this.file.id}`, processing);
    this.context.redis.publish(`/user/${this.context.user.id}`, processing);
    this.context.statsd.incr('file.upload.complete', 1);
  }

  async processImage(upload) {
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

  resizeImage(upload, type, currentSize, dim) {
    return resize(join(storePath, this.path), type, currentSize, dim).then((image) => {
      const path = join(this.file.id[0], String(dim.width), `${this.file.id}_${this.file.name}`);
      debug('Writing file');
      debug(join(storePath, path));
      return fs.writeFile(join(storePath, path), image).then(() => {
        s3upload(fs.createReadStream(join(storePath, path)), path);
      }).catch(debug);
    }).catch(debug);
  }

  async finalise() {
    debug('finalise');
    this.file.size = this.receivedSize;
    this.file.status = 'active';
    this.file.processed = 'true';
    await this.file.save();
    this.completeEvent();
  }

  completeEvent() {
    debug('complete');
    const complete = `{"type": "file-added", "data": ${JSON.stringify(formatFile(this.file))}}`;
    this.context.redis.publish(`/file/${this.file.id}`, complete);
    this.context.redis.publish(`/user/${this.context.user.id}`, complete);
  }

  malwareScan() {
    if (process.env.VIRUSTOTAL_KEY) {
      // Check in the background
      process.nextTick(async () => {
        debug('Malware Scan');
        const result = await malware(this.file);
        if (result) {
          this.file.malwarePositives = result.positives;
          this.file.save();
          const fileMalware = await models.malware.create({
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
