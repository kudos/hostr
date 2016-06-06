import { join } from 'path';
import mime from 'mime-types';
import hostrFileStream from '../../lib/hostr-file-stream';
import { formatFile } from '../../lib/format';

const storePath = process.env.UPLOAD_STORAGE_PATH;

const referrerRegexes = [
  /^https:\/\/hostr.co/,
  /^https:\/\/localhost.hostr.co/,
  /^http:\/\/localhost:4040/,
];

function userAgentCheck(userAgent) {
  if (!userAgent) {
    return false;
  }
  return userAgent.match(/^(wget|curl|vagrant)/i);
}

function referrerCheck(referrer) {
  return referrer && referrerRegexes.some((regex) => referrer.match(regex));
}

function hotlinkCheck(file, userAgent, referrer) {
  return userAgentCheck(userAgent) || file.width || referrerCheck(referrer);
}

export function* get() {
  const file = yield this.db.Files.findOne({
    _id: this.params.id,
    file_name: this.params.name,
    status: 'active',
  });
  this.assert(file, 404);

  if (!hotlinkCheck(file, this.headers['user-agent'], this.headers.referer)) {
    this.redirect(`/${file._id}`);
    return;
  }

  if (!file.width && this.request.query.warning !== 'on') {
    this.redirect(`/${file._id}`);
    return;
  }

  if (file.malware) {
    const alert = this.request.query.alert;
    if (!alert || !alert.match(/i want to download malware/i)) {
      this.redirect(`/${file._id}`);
      return;
    }
  }

  let localPath = join(storePath, file._id[0], `${file._id}_${file.file_name}`);
  let remotePath = join(file._id[0], `${file._id}_${file.file_name}`);
  if (this.params.size > 0) {
    localPath = join(storePath, file._id[0], this.params.size, `${file._id}_${file.file_name}`);
    remotePath = join(file._id[0], this.params.size, `${file._id}_${file.file_name}`);
  }

  if (file.malware) {
    this.statsd.incr('file.malware.download', 1);
  }

  let type = 'application/octet-stream';
  if (file.width > 0) {
    if (this.params.size) {
      this.statsd.incr('file.view', 1);
    }
    type = mime.lookup(file.file_name);
  } else {
    this.statsd.incr('file.download', 1);
  }

  if (userAgentCheck(this.headers['user-agent'])) {
    this.set('Content-Disposition', `attachment; filename=${file.file_name}`);
  }

  this.set('Content-type', type);
  this.set('Expires', new Date(2020, 1).toISOString());
  this.set('Cache-control', 'max-age=2592000');

  if (!this.params.size || (this.params.size && this.params.size > 150)) {
    this.db.Files.updateOne(
      { _id: file._id },
      { $set: { last_accessed: Math.ceil(Date.now() / 1000) }, $inc: { downloads: 1 } },
      { w: 0 });
  }

  this.body = yield hostrFileStream(localPath, remotePath);
}

export function* resized() {
  yield get.call(this);
}

export function* landing() {
  const file = yield this.db.Files.findOne({ _id: this.params.id, status: 'active' });
  this.assert(file, 404);
  if (userAgentCheck(this.headers['user-agent'])) {
    this.params.name = file.file_name;
    yield get.call(this);
    return;
  }

  this.statsd.incr('file.landing', 1);
  const formattedFile = formatFile(file);
  yield this.render('file', { file: formattedFile });
}
